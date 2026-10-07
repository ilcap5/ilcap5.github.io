// Public settings of the dashboard. The OAuth client ID is not a secret: Google only accepts it
// from the origins listed in the Cloud console (https://ilcap5.github.io).
export const CONFIG = {
  clientId: "",
  scope: "https://www.googleapis.com/auth/spreadsheets",
  followupDays: 14,
};
