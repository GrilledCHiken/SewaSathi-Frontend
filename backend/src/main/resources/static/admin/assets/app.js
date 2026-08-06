/*
 * Admin console behaviour (requirement #4: AJAX for dynamic interactions).
 *
 * Two jobs: send state-changing calls to /admin/api without a full page reload, and warn
 * before the session times out. No framework and no inline script, so the page's
 * Content-Security-Policy can stay at 'self'.
 */
(function () {
    "use strict";

    var csrfToken = meta("_csrf");
    var csrfHeader = meta("_csrf_header") || "X-CSRF-TOKEN";

    function meta(name) {
        var el = document.querySelector('meta[name="' + name + '"]');
        return el ? el.getAttribute("content") : null;
    }

    /* ---------- toast ---------- */

    var toastEl = document.getElementById("toast");
    var toastTimer = null;

    function toast(message, isError) {
        if (!toastEl) {
            return;
        }
        toastEl.textContent = message;
        toastEl.classList.toggle("error", !!isError);
        toastEl.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.hidden = true;
        }, 4000);
    }

    /* ---------- AJAX ---------- */

    /**
     * POSTs to an admin endpoint with the CSRF token attached. Without the token header the
     * server answers 403 by design - that is the protection, not a bug.
     *
     * `body`, when given, is sent as JSON; endpoints that take no payload omit it entirely
     * rather than posting an empty object.
     */
    function post(path, body) {
        var headers = { Accept: "application/json" };
        if (csrfToken) {
            headers[csrfHeader] = csrfToken;
        }
        if (body) {
            headers["Content-Type"] = "application/json";
        }
        return fetch(path, {
            method: "POST",
            headers: headers,
            body: body ? JSON.stringify(body) : undefined,
            // The session cookie is what authenticates these calls.
            credentials: "same-origin"
        }).then(function (response) {
            if (response.status === 401 || response.status === 403) {
                // Most likely the session lapsed between page load and this click.
                throw new Error(document.body.dataset.msgDenied || "Session expired or access denied.");
            }
            if (!response.ok) {
                return response.json().catch(function () {
                    return {};
                }).then(function (body) {
                    throw new Error(body.message || "Request failed (" + response.status + ")");
                });
            }
            return response.json();
        });
    }

    /**
     * `buildBody` is optional. Returning nothing posts without a payload; returning false
     * abandons the click, which is how a cancelled prompt stops short of the server.
     */
    function bindAction(selector, buildPath, onSuccess, buildBody) {
        document.querySelectorAll(selector).forEach(function (button) {
            button.addEventListener("click", function () {
                var body = buildBody ? buildBody(button) : undefined;
                if (body === false) {
                    return;
                }
                button.disabled = true;
                post(buildPath(button), body)
                    .then(function (data) {
                        onSuccess(button, data);
                    })
                    .catch(function (error) {
                        toast(error.message, true);
                        button.disabled = false;
                    });
            });
        });
    }

    // Verification queue: approving or rejecting removes the card, since either outcome
    // takes the worker out of the pending list the page was rendered from.
    bindAction(
        ".js-worker-action",
        function (button) {
            return "/admin/api/workers/" + button.dataset.workerId + "/" + button.dataset.action;
        },
        function (button) {
            var card = document.getElementById("worker-" + button.dataset.workerId);
            if (card) {
                card.remove();
            }
            toast(
                button.dataset.action === "approve"
                    ? "Worker approved. They have been emailed."
                    : "Worker rejected. They have been emailed the reason."
            );
        },
        function (button) {
            if (button.dataset.action !== "reject") {
                // There is nothing to explain about an approval.
                return undefined;
            }
            // window.prompt for the same reason the suspend action uses one - see below.
            var reason = window.prompt(document.body.dataset.msgRejectReason || "Reason for rejection");
            if (reason === null || !reason.trim()) {
                return false;
            }
            return { reason: reason.trim() };
        }
    );

    // User list: suspend/unsuspend flips in place rather than reloading, so the admin keeps
    // their scroll position and any filter they had applied.
    bindAction(
        ".js-user-action",
        function (button) {
            return "/admin/api/users/" + button.dataset.userId + "/" + button.dataset.action;
        },
        function (button, user) {
            var suspending = button.dataset.action === "suspend";
            button.dataset.action = suspending ? "unsuspend" : "suspend";
            button.textContent = suspending ? "Unsuspend" : "Suspend";
            button.classList.toggle("btn-danger", !suspending);
            button.classList.toggle("btn-primary", suspending);
            button.disabled = false;

            var statusCell = document.querySelector("#user-" + user.id + " td:nth-child(4)");
            if (statusCell) {
                statusCell.innerHTML = "";
                var tag = document.createElement("span");
                tag.className = suspending ? "tag tag-danger" : "tag";
                tag.textContent = suspending ? "Suspended" : user.status;
                statusCell.appendChild(tag);
            }
            toast(
                suspending
                    ? (user.emailSent === false
                        ? "Account suspended, but the notification email could not be sent."
                        : "Account suspended. They have been emailed.")
                    : "Account restored. They have been emailed."
            );
        },
        function (button) {
            if (button.dataset.action !== "suspend") {
                // Restoring takes an optional note; the console does not ask for one.
                return undefined;
            }
            /*
             * window.prompt rather than a dialog: this console has no modal of its own, and
             * the React admin app is where the richer form lives. The server rejects a blank
             * reason anyway - asking here just saves the round trip.
             */
            var reason = window.prompt(document.body.dataset.msgSuspendReason || "Reason for suspension");
            if (reason === null || !reason.trim()) {
                return false;
            }
            return { reason: reason.trim() };
        }
    );

    /* ---------- idle session warning ---------- */

    /*
     * The countdown runs locally rather than polling the server, because a poll is itself a
     * request: it would reset the container's idle clock and the session would never expire.
     */
    var timeoutSeconds = parseInt(meta("session-timeout"), 10);
    var warningEl = document.getElementById("idle-warning");
    var extendButton = document.getElementById("idle-extend");

    if (timeoutSeconds > 60 && warningEl) {
        var warnAt = (timeoutSeconds - 60) * 1000;
        var expireAt = timeoutSeconds * 1000;
        var warnTimer;
        var expireTimer;

        function startIdleClock() {
            clearTimeout(warnTimer);
            clearTimeout(expireTimer);
            warningEl.hidden = true;

            warnTimer = setTimeout(function () {
                warningEl.hidden = false;
            }, warnAt);

            // Once the server has dropped the session, any click would bounce through the
            // login redirect anyway - going there directly is less confusing.
            expireTimer = setTimeout(function () {
                window.location.href = "/admin/login?expired";
            }, expireAt);
        }

        extendButton.addEventListener("click", function () {
            extendButton.disabled = true;
            post("/admin/api/session/extend")
                .then(function () {
                    startIdleClock();
                })
                .catch(function () {
                    window.location.href = "/admin/login?expired";
                })
                .finally(function () {
                    extendButton.disabled = false;
                });
        });

        startIdleClock();
    }
})();
