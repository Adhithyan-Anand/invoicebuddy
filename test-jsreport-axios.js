const axios = require('axios');
const fs = require('fs');

axios.post(
  'https://adhithya.jsreportonline.net/api/report',
  {
    template: { shortid: '1y6GWFJ' },
    data: { test: 'value' }
  },
  {
    responseType: 'stream',
    auth: {
      username: 'anandadhithyan@gmail.com',
      password: 'Omega@2255'
    }
  }
).then(res => {
  res.data.pipe(fs.createWriteStream('test-node.pdf'));
  console.log('PDF written as test-node.pdf');
}).catch(err => {
  console.error('Error:', err.response?.status, err.response?.statusText, err.message);
});
