// Where each role lands after signing in (and when a guard blocks it).
export const homeFor = (role) => {
  switch (role) {
    case "SuperAdmin":
      return "/admin";
    case "CenterOwner":
      return "/center/dashboard";
    case "Teacher":
      return "/teacher/dashboard";
    case "Student":
      return "/student";
    case "Parent":
      return "/parent/dashboard";
    default:
      return "/dashboard";
  }
};
