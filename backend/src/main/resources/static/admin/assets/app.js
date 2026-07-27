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
     */
    function post(path) {
        var headers = { Accept: "application/json" };
        if (csrfToken) {
            headers[csrfHeader] = csrfToken;
        }
        return fetch(path, {
            method: "POST",
            headers: headers,
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

    function bindAction(selector, buildPath, onSuccess) {
        document.querySelectorAll(selector).forEach(function (button) {
            button.addEventListener("click", function () {
                button.disabled = true;
                post(buildPath(button))
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
            toast(button.dataset.action === "approve" ? "Worker approved." : "Worker rejected.");
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
            toast(suspending ? "Account suspended." : "Account restored.");
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
