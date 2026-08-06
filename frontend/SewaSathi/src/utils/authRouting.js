/**
 * Where a signed-in user belongs.
 *
 * Login.jsx worked this out in two places already — once in the mount guards that bounce an
 * existing session, once in the submit handler — and the Google paths would have made four
 * copies of the same three-way branch.
 *
 * @param {{ role?: string } | null | undefined} user
 * @param {string} from  where the user was headed before being sent to sign in; customers only,
 *                       since /admin and /worker have their own trees
 */
export function routeForRole(user, from = "/dashboard") {
  switch (user?.role) {
    case "ADMIN":
      return "/admin";
    case "WORKER":
      return "/worker";
    case "CUSTOMER":
      return from;
    default:
      return "/";
  }
}

export default routeForRole;
