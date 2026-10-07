// Public settings of the dashboard. The OAuth client ID is not a secret: Google only accepts it
// from the origins listed in the Cloud console (https://ilcap5.github.io).
export const CONFIG = {
  clientId: "23389660951-6gcaenbvb3biah0b5f8vcuoiq85a5des.apps.googleusercontent.com",
  // "openid email" lets the profile API check who is calling.
  scope: "https://www.googleapis.com/auth/spreadsheets openid email",
  // Profile API (Cloudflare Worker, job_finder_bot/worker). Empty until it is deployed.
  apiUrl: "https://jobscout-api.federico-scordo5.workers.dev",
  followupDays: 14,
  userName: "Federico",
};
