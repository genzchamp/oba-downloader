const express = require("express");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
app.disable("x-powered-by");
// Render runs behind a reverse proxy; trust the first proxy so rate limiting can read client IPs.
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: true, legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

const HOSTS = { TikTok:["tiktok.com","vm.tiktok.com","vt.tiktok.com","tt.site"], Instagram:["instagram.com"], YouTube:["youtube.com","youtu.be","music.youtube.com"], Facebook:["facebook.com","fb.watch"], X:["x.com","twitter.com","t.co"], Pinterest:["pinterest.com","pin.it"], Reddit:["reddit.com","redd.it","v.redd.it"], Snapchat:["snapchat.com"], Threads:["threads.net"] };
function isHost(host,domain){return host===domain||host.endsWith("."+domain);}
function extractUrl(input){
 const text=String(input||"").trim(); if(!text)return "";
 const candidates=text.match(/https?:\/\/[^\s<>"'\u201c\u201d]+/gi)||[];
 for(const candidate of candidates){const cleaned=candidate.replace(/[)\]}>,.!?;:'"\u2019]+$/g,"");try{const parsed=new URL(cleaned);if(Object.values(HOSTS).flat().some(domain=>isHost(parsed.hostname.toLowerCase(),domain)))return parsed.toString();}catch{}}
 const bare=text.match(/(?:www\.|vm\.|vt\.|m\.|lite\.)?(?:tiktok\.com|tt\.site|instagram\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch|x\.com|twitter\.com|t\.co|pinterest\.com|pin\.it|reddit\.com|redd\.it|snapchat\.com|threads\.net)\/[^\s<>"']+/i);
 return bare?"https://"+bare[0].replace(/[)\]}>,.!?;:'"\u2019]+$/g,""):"";
}
function identifyPlatform(raw){let parsed;try{parsed=new URL(raw);}catch{return null;}if(!["http:","https:"].includes(parsed.protocol)||parsed.username||parsed.password)return null;const host=parsed.hostname.toLowerCase();for(const [platform,hosts]of Object.entries(HOSTS))if(hosts.some(domain=>isHost(host,domain)))return platform;return null;}
async function resolveTikTokShare(raw){
 let current=raw;
 for(let i=0;i<6;i++){
  const parsed=new URL(current);const host=parsed.hostname.toLowerCase();
  const onTikTok=isHost(host,"tiktok.com");const onShareShortener=isHost(host,"tt.site");
  if(!onTikTok&&!onShareShortener)throw new Error("TikTok share link redirected to an unexpected domain.");
  const isShort=onShareShortener||["vm.tiktok.com","vt.tiktok.com","m.tiktok.com","lite.tiktok.com"].some(d=>isHost(host,d));
  if(!isShort)return current;
  const response=await axios.get(current,{maxRedirects:0,timeout:10000,validateStatus:s=>s>=200&&s<400,headers:{"User-Agent":"Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36"}});
  if(!response.headers.location)return current;
  const next=new URL(response.headers.location,current);const nextHost=next.hostname.toLowerCase();
  if(!isHost(nextHost,"tiktok.com")&&!isHost(nextHost,"tt.site"))throw new Error("TikTok share link redirected outside the expected domains.");
  current=next.toString();
 }
 return current;
}
function firstString(...values){for(const value of values)if(typeof value==="string"&&/^https:\/\//i.test(value))return value;return "";}
function findNestedMedia(data){
 const video=data?.video||data?.video_info||data?.aweme_detail?.video||{};
 const urls=video?.play_addr?.url_list||video?.download_addr?.url_list||video?.playAddr?.urlList||[];
 return firstString(data?.hdplay,data?.play,data?.wmplay,data?.url,data?.video_url,data?.download_url,data?.downloadUrl,data?.play_url,data?.play_addr,data?.video?.play,data?.video?.url,video?.play_addr?.url,video?.download_addr?.url,...urls);
}
const PRIORITY_PLATFORMS=["Instagram","Facebook","Snapchat","YouTube","X"];
function cobaltConfigured(){return Boolean(process.env.COBALT_API_URL&&/^https:\/\//i.test(process.env.COBALT_API_URL));}
function cobaltBase(){return String(process.env.COBALT_API_URL||"").trim().replace(/\/+$/,"");}
function safeCobaltUrl(raw){
 try{const u=new URL(raw,cobaltBase());const base=new URL(cobaltBase());return u.protocol==="https:"&&u.origin===base.origin?u.toString():null;}catch{return null;}
}
app.get("/api",(_req,res)=>res.json({app:"ØBΛ Downloader",version:"2.4.0",status:"online",supportedPlatforms:["TikTok links and share text",...(cobaltConfigured()?PRIORITY_PLATFORMS:[])],plannedPlatforms:cobaltConfigured()?["Pinterest","Reddit","Threads"]:PRIORITY_PLATFORMS.concat(["Pinterest","Reddit","Threads"]),engineConfigured:cobaltConfigured()}));
app.get("/health",(_req,res)=>res.json({ok:true}));
app.get("/file",async(req,res)=>{
 const raw=typeof req.query.url==="string"?req.query.url:"";let media;try{media=new URL(raw);}catch{return res.status(400).send("Invalid media URL.");}
 const allowed=["tiktokcdn.com","tiktokv.com","byteoversea.com","ibytedtos.com","akamaized.net","tikwm.com","tiktokcdn-us.com","bytecdn.cn"];
 if(media.protocol!=="https:"||!allowed.some(domain=>isHost(media.hostname.toLowerCase(),domain)))return res.status(400).send("This media host is not allowed.");
 try{const upstream=await axios.get(media.toString(),{responseType:"stream",timeout:30000,headers:{"User-Agent":"Mozilla/5.0",Referer:"https://www.tiktok.com/"},maxRedirects:4});
 const contentType=upstream.headers["content-type"]||"video/mp4";if(!contentType.startsWith("video/")&&!contentType.includes("octet-stream")){upstream.data.destroy();return res.status(502).send("The provider did not return a video file.");}
 res.setHeader("Content-Type",contentType);res.setHeader("Content-Disposition",'attachment; filename="oba-tiktok-video.mp4"');res.setHeader("Cache-Control","no-store");upstream.data.on("error",()=>{if(!res.headersSent)res.status(502);res.end();});upstream.data.pipe(res);
 }catch(error){console.error("Media download failed:",error.message);if(!res.headersSent)res.status(502).send("Could not start the download. Please try again.");}
});
app.get("/cobalt-file",async(req,res)=>{
 if(!cobaltConfigured())return res.status(503).send("The download engine is not configured.");
 const target=safeCobaltUrl(typeof req.query.url==="string"?req.query.url:"");
 if(!target)return res.status(400).send("Invalid download address.");
 try{
  const upstream=await axios.get(target,{responseType:"stream",timeout:90000,maxRedirects:0,validateStatus:status=>status>=200&&status<400,headers:{Accept:"*/*","User-Agent":"Mozilla/5.0"}});
  if(upstream.status>=300&&upstream.status<400){
   const redirected=safeCobaltUrl(new URL(upstream.headers.location||"",target).toString());
   upstream.data?.destroy?.();
   if(!redirected)return res.status(502).send("The engine redirected to an unexpected address.");
   return res.redirect(302,"/cobalt-file?url="+encodeURIComponent(redirected));
  }
  const type=String(upstream.headers["content-type"]||"application/octet-stream");
  if(type.includes("text/html")||type.includes("application/json")){upstream.data.destroy();return res.status(502).send("The engine did not return a media file.");}
  res.setHeader("Content-Type",type);
  res.setHeader("Content-Disposition",'attachment; filename="oba-social-media"');
  res.setHeader("Cache-Control","no-store");
  upstream.data.on("error",()=>{if(!res.headersSent)res.status(502);res.end();});upstream.data.pipe(res);
 }catch(error){console.error("Open-source media stream failed:",error.message);if(!res.headersSent)res.status(502).send("Could not start the download. Please try again.");}
});
app.get("/download",async(req,res)=>{
 const rawInput=typeof req.query.url==="string"?req.query.url.trim():"";if(!rawInput||rawInput.length>4096)return res.status(400).json({success:false,message:"Paste a video link or the full share message copied from the app."});
 const raw=extractUrl(rawInput);if(!raw)return res.status(400).json({success:false,message:"I couldn't find a social video link in that text. Copy the share message again, or paste the link."});
 const platform=identifyPlatform(raw);if(!platform)return res.status(400).json({success:false,message:"That link is not from a supported social platform. Please check the copied URL."});
 try{
  if(platform==="TikTok"){
   const resolved=await resolveTikTokShare(raw);let payload;
   for(const endpoint of ["https://www.tikwm.com/api/","https://tikwm.com/api/"]){try{const response=await axios.get(endpoint,{params:{url:resolved,hd:1},timeout:25000,headers:{"User-Agent":"Mozilla/5.0",Referer:"https://www.tiktok.com/"}});if(response.data?.code===0&&response.data?.data){payload=response.data;if(findNestedMedia(payload.data))break;}}catch(err){console.warn("TikWM endpoint failed:",endpoint,err.message);}}
   if(!payload?.data)return res.status(422).json({success:false,platform,message:"The TikTok provider could not retrieve this video. Try a public video link copied again from TikTok Lite."});
   const data=payload.data;const mediaUrl=findNestedMedia(data);
   if(!mediaUrl){console.warn("TikTok provider returned metadata without a media URL. Available keys:",Object.keys(data||{}));return res.status(502).json({success:false,platform,message:"The provider returned video details but no downloadable video file for this link. Try another public video or try again later."});}
   return res.json({success:true,platform,data:{title:data.title||"TikTok video",cover:data.cover||data.origin_cover||data.video?.cover||"",videoUrl:mediaUrl,downloadUrl:"/file?url="+encodeURIComponent(mediaUrl)}});
  }
  if(PRIORITY_PLATFORMS.includes(platform)){
   if(!cobaltConfigured())return res.status(503).json({success:false,platform,message:"The open-source download engine is not connected yet. TikTok downloads are still available; additional platforms will activate after the engine is deployed."});
   const requestHeaders={Accept:"application/json","Content-Type":"application/json"};
   if(process.env.COBALT_API_KEY)requestHeaders.Authorization=(process.env.COBALT_AUTH_SCHEME||"Api-Key")+" "+process.env.COBALT_API_KEY;
   console.info("Cobalt request starting:",{platform,engine:cobaltBase(),apiKeyConfigured:Boolean(process.env.COBALT_API_KEY)});
   // Render free services may sleep. Retry transient gateway errors after pinging the engine to wake it.
   let upstream;
   for(let attempt=0;attempt<3;attempt++){
    try{
     upstream=await axios.post(cobaltBase()+"/",{url:raw,videoQuality:"720",youtubeVideoCodec:"h264",filenameStyle:"basic",alwaysProxy:true},{headers:requestHeaders,timeout:90000,validateStatus:()=>true});
    }catch(error){
     if(attempt===2)throw error;
     console.warn("Cobalt request failed before a response; attempting wake/retry:",{platform,attempt:attempt+1,error:error.message});
    }
    const contentType=String(upstream?.headers?.["content-type"]||"");
    const transientFailure=!upstream||[502,503,504].includes(upstream.status)||(upstream.status>=500&&contentType.includes("text/html"));
    if(!transientFailure||attempt===2)break;
    console.warn("Cobalt appears temporarily unavailable; waking engine before retry:",{platform,httpStatus:upstream?.status,attempt:attempt+1});
    try{await axios.get(cobaltBase()+"/",{timeout:20000,validateStatus:()=>true,headers:{Accept:"text/html,application/json","User-Agent":"Mozilla/5.0"}});}catch(wakeError){console.warn("Cobalt wake request did not complete:",wakeError.message);}
    await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));
   }
   const body=upstream.data||{};
   if(upstream.status<200||upstream.status>=300||body.status==="error"){
    const errorCode=body.error&&typeof body.error==="object"?(body.error.code||body.error.status||"unknown"):typeof body.error==="string"?body.error:"unknown";
    const responseType=typeof upstream.data;
    const contentType=String(upstream.headers["content-type"]||"unknown");
    const responsePreview=typeof upstream.data==="string"?upstream.data.slice(0,240).replace(/\\s+/g," "):upstream.data&&typeof upstream.data==="object"?JSON.stringify(upstream.data).slice(0,240):"empty";
    console.warn("Cobalt request rejected:",{platform,httpStatus:upstream.status,cobaltStatus:body.status||"unknown",errorCode,responseType,contentType,responsePreview});
    return res.status(422).json({success:false,platform,message:"The open-source engine could not process this link. It may be private, restricted, unsupported, or temporarily unavailable."});
   }
   if(body.status==="picker"&&Array.isArray(body.picker)&&body.picker.length){
    const items=body.picker.map(item=>({type:item.type||"video",url:safeCobaltUrl(item.url)||"",thumb:typeof item.thumb==="string"?item.thumb:""})).filter(item=>item.url);
    if(!items.length)return res.status(502).json({success:false,platform,message:"The engine returned media choices that could not be safely opened."});
    return res.json({success:true,platform,picker:items,message:"Choose a media item to download."});
   }
   if(body.status==="tunnel"){
    const target=safeCobaltUrl(body.url);
    if(!target)return res.status(502).json({success:false,platform,message:"The engine returned an unexpected tunnel address."});
    return res.json({success:true,platform,data:{title:platform+" media",videoUrl:target,downloadUrl:"/cobalt-file?url="+encodeURIComponent(target)}});
   }
   if(body.status==="redirect"){
    let target;try{target=new URL(body.url);}catch{return res.status(502).json({success:false,platform,message:"The engine returned an invalid download address."});}
    if(target.protocol!=="https:"||target.username||target.password)return res.status(502).json({success:false,platform,message:"The engine returned an unsafe download address."});
    return res.json({success:true,platform,data:{title:platform+" media",videoUrl:target.toString(),downloadUrl:target.toString()}});
   }
   return res.status(422).json({success:false,platform,message:"This media link did not produce a downloadable file. Try a public post or video."});
  }
  const guidance={Pinterest:"Pinterest downloading is not enabled yet.",Reddit:"Reddit downloading is not enabled yet.",Threads:"Threads downloading is not enabled yet."};
  return res.status(501).json({success:false,platform,message:guidance[platform]||"This platform is not enabled yet."});
 }catch(error){console.error("Download request failed:",error.message);return res.status(502).json({success:false,platform,message:"The platform or downloader service could not process this link right now. Please try again shortly."});}
});
app.get(/.*/,(req,res,next)=>{if(req.path.startsWith("/api/")||["/download","/file","/cobalt-file"].includes(req.path))return next();res.sendFile(path.join(__dirname,"public","index.html"));});
app.listen(PORT,"0.0.0.0",()=>console.log(`ØBΛ Downloader listening on port ${PORT}`));
