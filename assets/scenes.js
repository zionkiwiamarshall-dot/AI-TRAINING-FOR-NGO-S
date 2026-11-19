/* ---------- illustrated people and office scenes ---------- */
var PPL={
 neema:{name:"Neema",role:"Monitoring and evaluation officer, maternal health NGO, Mwanza",skin:"#6b4226",hair:"wrap",hc:"#1EB53A",shirt:"#FCD116"},
 juma:{name:"Juma",role:"Programme officer, farmer groups, Morogoro",skin:"#4e2f1c",hair:"short",shirt:"#00A3DD"},
 amina:{name:"Amina",role:"Communications lead, girls' education NGO, Dar es Salaam",skin:"#7a4a2b",hair:"hijab",hc:"#0d0d0d",trim:"#FCD116",shirt:"#00A3DD"},
 peter:{name:"Peter",role:"Finance officer, savings and credit cooperative (SACCO), Arusha",skin:"#6b4226",hair:"short",glasses:1,shirt:"#1EB53A"},
 baraka:{name:"Baraka",role:"WASH officer, Dodoma",skin:"#5a3620",hair:"short",beard:1,shirt:"#00A3DD"},
 daudi:{name:"Daudi",role:"Conservation officer, Iringa",skin:"#4e2f1c",hair:"short",shirt:"#7d7346"},
 rehema:{name:"Rehema",role:"Safeguarding lead, Dar es Salaam",skin:"#7a4a2b",hair:"bun",shirt:"#6b3f8f"},
 salma:{name:"Salma",role:"Advocacy officer, Zanzibar",skin:"#8a5a3a",hair:"hijab",hc:"#00A3DD",trim:"#0d0d0d",shirt:"#0d0d0d"}
};
function svgEsc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
function wrap(t,n){var w=String(t).split(" "),L=[],c="";w.forEach(function(x){if((c+" "+x).trim().length>n&&c){L.push(c);c=x;}else c=(c+" "+x).trim();});if(c)L.push(c);return L;}
function person(id,mood,x,y,s){
 var P=PPL[id],hj=P.hair==="hijab",r=hj?15:18,g='<g transform="translate('+x+','+y+') scale('+(s||1)+')">';
 if(hj)g+='<path d="M-25 6C-27-31 27-31 25 6L29 42C10 50-10 50-29 42Z" fill="'+P.hc+'"/>';
 g+='<path d="M-33 76C-33 40-21 27 0 27C21 27 33 40 33 76Z" fill="'+P.shirt+'"/>';
 if(!hj){g+='<rect x="-6" y="13" width="12" height="16" fill="'+P.skin+'"/><path d="M-8 27L0 37L8 27" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="2"/>';g+='<circle cx="-17.5" cy="2" r="4" fill="'+P.skin+'"/><circle cx="17.5" cy="2" r="4" fill="'+P.skin+'"/>';}
 else g+='<path d="M-21 16C-16 32 16 32 21 16L24 40C10 47-10 47-24 40Z" fill="'+P.hc+'"/><path d="M-21 16C-16 32 16 32 21 16" fill="none" stroke="'+P.trim+'" stroke-width="2"/>';
 g+='<circle cx="0" cy="0" r="'+r+'" fill="'+P.skin+'"/>';
 if(P.hair==="short"||P.hair==="bun")g+='<path d="M-18-2C-19-25 19-25 18-2C15-13-15-13-18-2Z" fill="#1a1a1a"/>';
 if(P.hair==="bun")g+='<circle cx="0" cy="-23" r="8" fill="#1a1a1a"/>';
 if(P.hair==="wrap")g+='<path d="M-21-3C-25-35 25-35 21-3C12-12-12-12-21-3Z" fill="'+P.hc+'"/><path d="M-20-12C-8-18 8-18 20-12" stroke="#FCD116" stroke-width="2.6" fill="none"/><path d="M-21-20C-8-26 8-26 21-20" stroke="#0d0d0d" stroke-width="2" fill="none"/><circle cx="17" cy="-24" r="6.5" fill="'+P.hc+'"/>';
 if(hj)g+='<path d="M-15-1C-14-19 14-19 15-1C10-10-10-10-15-1Z" fill="'+P.hc+'"/><path d="M-15-1C-10-10 10-10 15-1" fill="none" stroke="'+P.trim+'" stroke-width="1.6"/>';
 if(P.beard)g+='<path d="M-14 6C-12 22 12 22 14 6C8 15-8 15-14 6Z" fill="#1a1a1a"/>';
 var ey=hj?2:0;
 g+='<circle cx="-6" cy="'+ey+'" r="1.9" fill="#111"/><circle cx="6" cy="'+ey+'" r="1.9" fill="#111"/>';
 if(mood==="worried")g+='<path d="M-10 '+(ey-5)+'L-3 '+(ey-8)+'M10 '+(ey-5)+'L3 '+(ey-8)+'" stroke="#111" stroke-width="1.6" stroke-linecap="round"/><path d="M-5 '+(ey+10)+'Q0 '+(ey+6)+' 5 '+(ey+10)+'" stroke="#111" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M14 '+(ey-12)+'q2 4 0 6q-2-2 0-6z" fill="#7fd3f5"/>';
 else if(mood==="happy")g+='<path d="M-10 '+(ey-7)+'Q-6 '+(ey-10)+' -2 '+(ey-7)+'M2 '+(ey-7)+'Q6 '+(ey-10)+' 10 '+(ey-7)+'" stroke="#111" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M-7 '+(ey+6)+'Q0 '+(ey+14)+' 7 '+(ey+6)+'Z" fill="#fff" stroke="#111" stroke-width="1.4"/>';
 else g+='<path d="M-10 '+(ey-7)+'L-3 '+(ey-7)+'M3 '+(ey-7)+'L10 '+(ey-7)+'" stroke="#111" stroke-width="1.6" stroke-linecap="round"/><path d="M-4 '+(ey+8)+'L4 '+(ey+8)+'" stroke="#111" stroke-width="1.8" stroke-linecap="round"/>';
 if(P.glasses)g+='<circle cx="-6" cy="0" r="5.5" fill="none" stroke="#FCD116" stroke-width="1.6"/><circle cx="6" cy="0" r="5.5" fill="none" stroke="#FCD116" stroke-width="1.6"/><path d="M-0.5 0h1" stroke="#FCD116" stroke-width="1.6"/>';
 return g+'</g>';
}
function avatar(id){return '<svg viewBox="-32 -32 64 64" aria-hidden="true"><defs><clipPath id="av-'+id+'"><circle r="32"/></clipPath></defs><circle r="32" class="wall"/><g clip-path="url(#av-'+id+')">'+person(id,"happy",0,4,0.82)+'</g></svg>';}
function room(w){return '<rect width="'+w+'" height="200" class="wall"/><rect y="182" width="'+w+'" height="18" class="floor"/>';}
function windowAt(x){return '<rect x="'+x+'" y="16" width="58" height="44" rx="3" class="sky sl" stroke-width="3"/><path d="M'+(x+29)+' 16v44M'+x+' 38h58" class="sl" stroke-width="3"/><path d="M'+(x+6)+' 54l12-12 10 8 14-14 10 18z" class="f1" opacity=".5"/>';}
function clock(x,h){var a=(h%12)/12*2*Math.PI;return '<circle cx="'+x+'" cy="30" r="13" class="fs sm" stroke-width="2.5"/><path d="M'+x+' 30L'+(x+7*Math.sin(a)).toFixed(1)+' '+(30-7*Math.cos(a)).toFixed(1)+'M'+x+' 30v-10" class="si" stroke-width="2" stroke-linecap="round"/>';}
function plant(x){return '<path d="M'+(x-9)+' 160h18l-3 22h-12z" fill="#a8774f"/><path d="M'+x+' 160c-14-6-16-22-6-28 2 10 6 14 6 28zM'+x+' 160c12-8 16-22 6-30-2 12-6 16-6 30z" class="f1"/>';}
function desk(x,w){return '<rect x="'+x+'" y="132" width="'+w+'" height="9" rx="2" fill="#a8774f"/><rect x="'+(x+8)+'" y="141" width="'+(w-16)+'" height="41" fill="#8d6240"/>';}
function laptopBack(cx){return '<path d="M'+(cx-24)+' 132L'+(cx-21)+' 113L'+(cx+21)+' 113L'+(cx+24)+' 132Z" fill="#b6bfbb"/><circle cx="'+cx+'" cy="123" r="2.5" fill="#eef2ef"/>';}
function papers(x,n){var s="";for(var i=0;i<n;i++)s+='<rect x="'+(x+(i%2)*3)+'" y="'+(124-i*6)+'" width="34" height="7" rx="1" fill="'+(i%3===2?"#fdf6d8":"#ffffff")+'" stroke="#c9cfcb"/>';return s;}
function bubble(x,y,w,t,tx,ty,cls,fs){fs=fs||12;var n=Math.floor((w-14)/(fs*0.52)),L=wrap(t,n),h=L.length*(fs+3)+12;var s='<path d="M'+(x+18)+' '+(y+h-1)+'L'+tx+' '+ty+'L'+(x+34)+' '+(y+h-1)+'Z" class="'+(cls||"fs")+' sl" stroke-width="1.5"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="10" class="'+(cls||"fs")+' sl" stroke-width="1.5"/>';
 L.forEach(function(l,i){s+='<text x="'+(x+8)+'" y="'+(y+fs+4+i*(fs+3))+'" font-size="'+fs+'" class="fi">'+svgEsc(l)+'</text>';});return s;}
function chat(x,y,w,you,ai,flag){
 var s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="186" rx="8" class="fs sl" stroke-width="1.5"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="18" rx="8" class="f3"/><rect x="'+x+'" y="'+(y+10)+'" width="'+w+'" height="8" class="f3"/><text x="'+(x+8)+'" y="'+(y+13)+'" font-size="9.5" fill="#FCD116" font-weight="700">AI assistant</text>';
 var fs=10,n=Math.floor((w-24)/(fs*0.52)),yl=y+26,Ly=wrap(you,n),La=wrap(ai,n);
 var hy=Ly.length*13+8;s+='<rect x="'+(x+14)+'" y="'+yl+'" width="'+(w-20)+'" height="'+hy+'" rx="6" class="bsoft"/>';Ly.forEach(function(l,i){s+='<text x="'+(x+20)+'" y="'+(yl+13+i*13)+'" font-size="'+fs+'" class="fi">'+svgEsc(l)+'</text>';});
 yl+=hy+6;var ha=La.length*13+8;s+='<rect x="'+(x+6)+'" y="'+yl+'" width="'+(w-20)+'" height="'+ha+'" rx="6" class="gsoft"/>';La.forEach(function(l,i){s+='<text x="'+(x+12)+'" y="'+(yl+13+i*13)+'" font-size="'+fs+'" class="fi">'+svgEsc(l)+'</text>';});
 yl+=ha+6;if(flag&&yl<y+168)s+='<rect x="'+(x+6)+'" y="'+yl+'" width="'+(w-12)+'" height="16" rx="8" class="f2"/><text x="'+(x+13)+'" y="'+(yl+11.5)+'" font-size="9.5" font-weight="700" fill="#0d0d0d">'+svgEsc(flag)+'</text>';
 return s;}
function panel(n,d,who){
 var s='<svg viewBox="0 0 240 200" role="img" aria-label="'+svgEsc(d.cap)+'">'+room(240);
 if(n===1){s+=windowAt(12)+clock(214,d.h||5)+desk(18,150)+person(who,"worried",78,80)+laptopBack(78)+papers(122,d.pile||5)+bubble(118,40,116,d.b,100,74);}
 if(n===2){s+=windowAt(12)+desk(10,110)+person(who,"neutral",58,80)+laptopBack(58)+'<path d="M82 120 L110 104" class="sm" stroke-width="1.5" stroke-dasharray="3 3"/>'+chat(112,6,122,d.you,d.ai,d.flag);}
 if(n===3){s+=windowAt(176)+plant(220)+desk(16,170)+person(who,"happy",70,80)+laptopBack(70)+'<rect x="112" y="108" width="30" height="24" rx="2" fill="#fff" stroke="#c9cfcb"/><path d="M117 115h20M117 121h20M117 127h12" stroke="#c9cfcb"/><circle cx="142" cy="108" r="9" class="f1"/><path d="M138 108l3 3 5-6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'+bubble(100,8,134,d.b,92,70,"gsoft");}
 return s+'</svg>';
}
var LABS=["The problem","How AI helps","The result"];
function strip(d){
 var labs=d.labs||LABS,h='<div class="strip">';
 [d.p1,d.p2,d.p3].forEach(function(p,i){h+='<div class="frame"><div class="plab"><span>'+(i+1)+'</span>'+svgEsc(labs[i])+'</div>'+panel(i+1,p,d.who)+'<p>'+svgEsc(p.cap)+'</p></div>';});
 return h+'</div>';
}
var STRIPS={
 ch1:{who:"amina",labs:["The problem","What AI does","The result"],p1:{b:"I need a Tanzania figure for this proposal by 5pm!",cap:"Amina needs a statistic on NGO AI use for a proposal due today.",h:4},p2:{you:"What % of Tanzanian NGOs use AI? Give a source.",ai:"47%, according to a 2024 national regulator survey.",flag:"Sounds right… is it?",cap:"The tool answers instantly, with a confident number and a named source."},p3:{b:"That survey doesn't exist. I'll use the real 2025 study.",cap:"She searches for the source, finds nothing, and uses a verified figure instead."}},
 ch2:{who:"amina",p1:{b:"Another post to write and ten minutes to do it.",cap:"Amina has to post about the reading club before a partner meeting.",h:9},p2:{you:"Role, task, our facts: 40 learners, 38 to 52 words per minute. Under 80 words.",ai:"Twelve weeks, 40 young readers, real progress…",flag:"Check every number",cap:"She gives the tool a four-part prompt with her own facts."},p3:{b:"Every number checks out. Posted!",cap:"Ready in ten minutes, with nothing invented."}},
 ch3:{who:"neema",p1:{b:"Can I paste this field note? It has her name and HIV status…",cap:"Neema wants help writing a donor paragraph from a sensitive field note.",pile:6,h:3},p2:{you:"Several women missed visits. Transport costs are high.",ai:"Clients report transport costs as the main barrier to attendance…",flag:"No one identifiable",cap:"She rewrites the note as a pattern, with no identifying details, before using AI."},p3:{b:"No one can be identified. Paragraph checked and done.",cap:"The donor gets the insight; the woman's privacy is protected."}},
 ch4:{who:"peter",p1:{b:"This member update takes me two hours every month.",cap:"Peter writes the SACCO's monthly update in English and Swahili.",pile:4,h:7},p2:{you:"Write this month's update from these group totals, English and Swahili.",ai:"Dear members, this month total savings rose…",flag:"Check figures",cap:"He pastes group totals only, never member balances."},p3:{b:"55 minutes, checked by the chair. 13 hours saved a year.",cap:"Honest saving: collecting figures still takes him 30 minutes."}},
 health:{who:"neema",p1:{b:"40 health messages to simplify before the SMS launch.",cap:"Approved messages are too technical for mothers to read on SMS.",pile:6},p2:{you:"Rewrite this approved message for mothers. Under 160 characters. Add nothing.",ai:"As soon as you think you are pregnant, visit your clinic… Take iron daily.",flag:"Extra advice added!",cap:"The plain version arrives in seconds, plus one sentence nobody approved."},p3:{b:"Extra advice removed. Clinician signed off.",cap:"Every message is checked against the approved source before launch."}},
 education:{who:"amina",p1:{b:"Our tutors need questions for every story by Saturday.",cap:"Volunteer tutors have stories but no comprehension questions."},p2:{you:"5 questions for Standard 4 from this story. Answers separate.",ai:"1. Where did Zawadi walk every morning? … Answer 2: mangoes and eggs",flag:"Eggs? Not in story",cap:"Questions in seconds; one answer adds something the story never said."},p3:{b:"Answer key checked against the story. Ready for Saturday.",cap:"A two-minute check keeps the answer key accurate."}},
 agri:{who:"juma",p1:{b:"Armyworm is spreading. 200 farmers need advice this week.",cap:"The district summary is two pages of technical text.",pile:5},p2:{you:"One-page advice sheet in simple Swahili, only from this summary.",ai:"Hatua 1: Kagua shamba lako… Hatua 3: [pesticide brand]",flag:"Brand not in source",cap:"A clear Swahili draft, but with a product the office never recommended."},p3:{b:"Brand removed, officer approved. 200 copies printed.",cap:"Farmers get fast advice that comes from a vetted source."}},
 human:{who:"juma",p1:{b:"Two villages flooded. The director needs a sitrep tonight.",cap:"Information is incomplete and the deadline is hours away.",h:5},p2:{you:"Sitrep from these verified notes. Write [MISSING] for any gap.",ai:"Households affected: about 140. Displaced: [MISSING]. Response: [MISSING]",flag:"2 gaps to fill",cap:"The draft shows exactly what still needs confirming."},p3:{b:"Two gaps filled by phone. Report sent by 6pm.",cap:"No invented figures in an emergency report."}},
 env:{who:"daudi",p1:{b:"Elephants raided three farms. Villagers want guidance.",cap:"Communities need safe, practical deterrent advice fast."},p2:{you:"250-word leaflet in Swahili: why elephants come, 3 safe deterrents.",ai:"Tembo huonekana karibu na [waterhole + grid ref]…",flag:"Location leaked!",cap:"His pasted notes held patrol details, and the AI repeated a location."},p3:{b:"Location removed. Next time I strip locations first.",cap:"Location data can help poachers, so it never goes in."}},
 wash:{who:"baraka",p1:{b:"The water committee wants weekly hygiene reminders.",cap:"Baraka has approved key messages but no time to write weekly texts."},p2:{you:"Five WhatsApp messages from these approved key messages.",ai:"Message 1: Always cover your water bucket… Message 4: boil 30 minutes",flag:"Check the guidance",cap:"Five friendly messages, one with the wrong boiling time."},p3:{b:"Corrected to match guidance. Sent every Monday.",cap:"A committee member reads them aloud to check they sound natural."}},
 liveli:{who:"peter",p1:{b:"Members keep asking how loan limits work.",cap:"The loan policy is four pages of formal text.",pile:4},p2:{you:"Explain this policy in plain Swahili, under 200 words. Add no rules.",ai:"You can borrow up to three times your savings… Interest: 1% a month",flag:"Rate not in policy",cap:"A clear explanation, with an interest rate the policy never stated."},p3:{b:"Approved rate inserted. The chair signed off.",cap:"Members get a leaflet they understand, with correct terms."}},
 protect:{who:"rehema",p1:{b:"New field staff start Monday. They need safeguarding training.",cap:"Rehema has public guidance but no ready quiz.",pile:5},p2:{you:"8 quiz questions from our public safeguarding guidance.",ai:"Q6: If a child discloses abuse, promise to keep it secret (correct)",flag:"Dangerous answer!",cap:"No case data used. But the AI marked a harmful answer as correct."},p3:{b:"Fixed. I review every item line by line.",cap:"Expert review turns a risky draft into safe training."}},
 gov:{who:"salma",p1:{b:"The bill consultation is Thursday. 40 pages to read.",cap:"Community leaders need a plain summary before the meeting.",pile:6},p2:{you:"Plain summary with the section number for every point.",ai:"Section 12: private schools must register within 6 months.",flag:"Check Section 12",cap:"Asking for section numbers makes every point quick to verify."},p3:{b:"Section 12 says 12 months. Corrected and linked.",cap:"One wrong legal detail caught before it reached 40 leaders."}}
};
function officeScene(){
 var ids=["neema","juma","amina","peter"],b=["Six donor reports due Friday.","200 farmers asked about armyworm today.","Three posts and a newsletter, no time.","Two hours on the member update. Again."];
 var s='<svg viewBox="0 0 760 210" role="img" aria-label="Four NGO staff at their desks, each overwhelmed by a different task">'+room(760).replace('height="200"','height="210"').replace('y="182"','y="192"')+windowAt(330)+windowAt(400)+clock(700,4);
 ids.forEach(function(id,i){var cx=95+i*190;s+='<rect x="'+(cx-70)+'" y="140" width="140" height="9" rx="2" fill="#a8774f"/><rect x="'+(cx-62)+'" y="149" width="124" height="43" fill="#8d6240"/>'+person(id,"worried",cx,90,0.9)+'<path d="M'+(cx-22)+' 140L'+(cx-19)+' 122L'+(cx+19)+' 122L'+(cx+22)+' 140Z" fill="#b6bfbb"/>'+papers(cx+30,3+i%3).replace(/y="(\d+)"/g,function(m,y){return 'y="'+(+y+8)+'"';})+bubble(cx-78,6,156,b[i],cx-10,62);});
 return s+'</svg>';
}

