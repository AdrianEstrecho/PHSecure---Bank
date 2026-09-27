// Vercel entry point: the whole Express API runs as one function; vercel.json rewrites /api/* here.
import { createApp } from "../server/app.js";

export default createApp();
