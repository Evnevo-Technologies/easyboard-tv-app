// import axios from "axios";

// const api = axios.create({
//     baseURL: '/api'
// })

// export default api;

import axios from "axios";

const api = axios.create({
  baseURL: "https://devices.dev.easyboard.co.in", 
  headers: {
    "Cache-Control": "no-store",
  },
});

export default api;
