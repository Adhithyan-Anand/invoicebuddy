import jsreport from 'jsreport-client';

// Hardcoded credentials for jsreport cloud (for debugging only)
const jsreportUrl = 'https://adhithya.jsreportonline.net';
const jsreportUser = 'anandadhithyan@gmail.com'; // <-- replace with your actual username if different
const jsreportPassword = 'Omega@2255'; // <-- replace with your actual password

export const jsreportClient = jsreport(jsreportUrl, {
  username: jsreportUser,
  password: jsreportPassword
});
