//const allowlist = ["http://localhost:3000", "http://localhost:8000", "http://localhost:4000"];
export const corsOptions = {
    origin: "*",
    //origin: function(origin: any, callback: any) {
    //    if (allowlist.includes(origin)) {
    //        callback(null, true);
    //    } else {
    //        callback(new Error("Not allowed by CORS"));
    //    }
    //},
    //credentials: true,
    //exposedHeaders: ["WWW-Authenticate"],
};
