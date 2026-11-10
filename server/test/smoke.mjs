const B=process.env.API_URL||'http://localhost:5000/api'; // Run against a freshly seeded DB: npm run seed && npm test
const call=async(m,p,t,body)=>{const r=await fetch(B+p,{method:m,headers:{'Content-Type':'application/json',...(t?{Authorization:'Bearer '+t}:{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch{};return{s:r.status,j}};
const login=async(e,p)=>(await call('POST','/auth/login',null,{email:e,password:p})).j.token;
const chk=(n,c,x='')=>console.log((c?'PASS':'FAIL')+' '+n+(c?'':' '+x));
const pat=await login('rohan@uhr.demo','Patient@123'), sh=await login('dr.sharma@uhr.demo','Doctor@123'), nair=await login('dr.nair@uhr.demo','Doctor@123'), adm=await login('admin@uhr.demo','Admin@123');
chk('logins',pat&&sh&&nair&&adm);
chk('bad login 401',(await call('POST','/auth/login',null,{email:'rohan@uhr.demo',password:'x'})).s===401);
let r=await call('GET','/patient/overview',pat); chk('patient overview',r.s===200&&r.j.patient.uhrId==='UHR-1000003',JSON.stringify(r.j).slice(0,200));
chk('patient blocked from doctor api',(await call('GET','/doctor/overview',pat)).s===403);
chk('unverified doctor blocked',(await call('GET','/doctor/overview',nair)).s===403);
r=await call('GET','/doctor/overview',sh); chk('doctor overview',r.s===200,JSON.stringify(r.j).slice(0,200));
r=await call('GET','/doctor/search?q=UHR-1000003',sh); const id=r.j.patients?.[0]?.id; chk('search by UHR id, no access',id&&r.j.patients[0].hasAccess===false,JSON.stringify(r.j));
chk('403 on record without access',(await call('GET','/doctor/patients/'+id,sh)).s===403);
r=await call('POST','/emergency/lookup',sh,{uhrId:'UHR-1000003'}); chk('emergency lookup',r.s===200,JSON.stringify(r.j));
const e=await call('GET','/patient/emergency',pat); chk('qr payload prefix, no medical data',e.j.qrPayload.startsWith('UHR-EMG:')&&!/Rohan|B\+/.test(e.j.qrPayload));
r=await call('POST','/emergency/lookup',sh,{qrToken:e.j.qrPayload}); chk('lookup via qr',r.s===200&&r.j.method==='qr');
chk('activate: bad password 401',(await call('POST','/emergency/activate',sh,{patientId:id,method:'qr',reason:'Unconscious patient needs allergy history',password:'nope',acknowledged:true})).s===401);
chk('activate: short reason 400',(await call('POST','/emergency/activate',sh,{patientId:id,method:'qr',reason:'short',password:'Doctor@123',acknowledged:true})).s===400);
r=await call('POST','/emergency/activate',sh,{patientId:id,method:'qr',reason:'Unconscious after seizure, needs allergy history',password:'Doctor@123',acknowledged:true}); chk('activate ok',r.s===201,JSON.stringify(r.j));
const sid=r.j.sessionId;
r=await call('GET','/emergency/session/'+sid,sh); chk('emergency dashboard',r.s===200&&r.j.patient.allergies.length===2&&r.j.contacts.length===2,JSON.stringify(r.j).slice(0,200));
chk('patient notified',(await call('GET','/notifications',pat)).j.unread>=1);
chk('other doctor cannot read session',(await call('GET','/emergency/session/'+sid,nair)).s===403);
await call('POST','/emergency/session/'+sid+'/end',sh); chk('ended session 410',(await call('GET','/emergency/session/'+sid,sh)).s===410);
r=await call('GET','/admin/stats',adm); chk('admin stats',r.s===200&&r.j.totals.patients===5&&r.j.totals.emergencyAccess===5,JSON.stringify(r.j.totals));
r=await call('GET','/admin/emergency-logs',adm); chk('admin emergency logs',r.j.logs.length===5);
r=await call('GET','/admin/audit?action=EMERGENCY_ACCESS_ACTIVATED',adm); chk('audit filter',r.j.total>=5);
r=await call('GET','/admin/users?role=doctor',adm); const nd=r.j.users.find(u=>u.email==='dr.nair@uhr.demo').doctor.id;
chk('verify doctor',(await call('PUT','/admin/doctors/'+nd+'/verify',adm,{verified:true})).s===200);
chk('now verified doctor ok',(await call('GET','/doctor/overview',nair)).s===200);
// register + validation
r=await call('POST','/auth/register',null,{name:'T',email:'bad',password:'weak',phone:'1',dob:'2090-01-01',gender:'x'}); chk('register validation 400',r.s===400&&r.j.errors.email,JSON.stringify(r.j));
const em='new'+Date.now()+'@test.dev';
r=await call('POST','/auth/register',null,{name:'New Patient',email:em,password:'Passw0rdX',phone:'+91 99999 00000',dob:'1995-05-05',gender:'female',bloodGroup:'B-'}); chk('register ok',r.s===201&&/^UHR-\d{7}$/.test(r.j.user.uhrId),JSON.stringify(r.j));
// doctor: prescribe for patient with access (Karthik via Patel)
const pa=await login('dr.patel@uhr.demo','Doctor@123'); const kar=(await call('GET','/doctor/search?q=Karthik',pa)).j.patients[0];
r=await call('POST','/doctor/patients/'+kar.id+'/prescriptions',pa,{medication:'Aspirin',dosage:'75 mg',frequency:'daily'}); chk('prescription created',r.s===201,JSON.stringify(r.j));
chk('record view ok',(await call('GET','/doctor/patients/'+kar.id,pa)).s===200);
// appointment booking
const ptoken=await login('meera@uhr.demo','Patient@123'); const docs=(await call('GET','/doctors',ptoken)).j.doctors;
// next Mon-Sat date >= 5 days out, 10:00 IST (clinic hours rule)
const slotAt=(h,m)=>{let d=new Date(Date.now()+5*864e5);for(;;){const iso=d.toISOString().slice(0,10);if(new Date(iso+'T12:00:00+05:30').getUTCDay()!==0)return new Date(`${iso}T${h}:${m}:00+05:30`).toISOString();d=new Date(d.getTime()+864e5)}};
const ok10=slotAt('10','00');
chk('odd-hour appt (03:17) rejected',(await call('POST','/patient/appointments',ptoken,{doctorId:docs[0].id,scheduledAt:slotAt('03','17'),reason:'3am'})).s===400);
chk('off-grid appt (10:15) rejected',(await call('POST','/patient/appointments',ptoken,{doctorId:docs[0].id,scheduledAt:slotAt('10','15'),reason:'odd'})).s===400);
const before=(await call('GET','/patient/access',ptoken)).j.doctors.find(d=>d.id===docs[0].id).granted;
r=await call('POST','/patient/appointments',ptoken,{doctorId:docs[0].id,scheduledAt:ok10,reason:'Checkup'}); chk('book appt (no consent)',r.s===201,JSON.stringify(r.j));
const after=(await call('GET','/patient/access',ptoken)).j.doctors.find(d=>d.id===docs[0].id).granted;
chk('booking without consent does NOT grant access',after===before);
chk('double book 409',(await call('POST','/patient/appointments',ptoken,{doctorId:docs[0].id,scheduledAt:ok10,reason:'Again'})).s===409);
chk('cancel appt',(await call('DELETE','/patient/appointments/'+r.j.appointment._id,ptoken)).s===200);
r=await call('POST','/patient/appointments',ptoken,{doctorId:docs[1].id,scheduledAt:slotAt('11','30'),reason:'With consent',shareRecord:true}); chk('book appt (with consent)',r.s===201,JSON.stringify(r.j));
chk('booking WITH consent grants access',(await call('GET','/patient/access',ptoken)).j.doctors.find(d=>d.id===docs[1].id).granted===true);
// medication link integrity
const pa2=await login('dr.patel@uhr.demo','Doctor@123'); const kt=await login('karthik@uhr.demo','Patient@123');
const kid=(await call('GET','/doctor/search?q=Karthik',pa2)).j.patients[0].id;
const rx2=(await call('POST','/doctor/patients/'+kid+'/prescriptions',pa2,{medication:'LinkTest',dosage:'1 mg',frequency:'daily'})).j.prescription;
let prof=(await call('GET','/patient/profile',kt)).j.patient;
await call('PUT','/patient/health',kt,{medications:prof.medications.map(({name,dose,frequency})=>({name,dose,frequency}))}); // link omitted by client
await call('PUT','/patient/health',kt,{medications:[...(await call('GET','/patient/profile',kt)).j.patient.medications.map(({_id,...x})=>x),{name:'Forged',prescriptionId:'64b000000000000000000000'}]});
await call('PUT','/doctor/prescriptions/'+rx2._id,pa2,{status:'discontinued'});
prof=(await call('GET','/patient/profile',kt)).j.patient;
chk('discontinued Rx removed from current meds even after patient edits',!prof.medications.some(m=>m.name==='LinkTest'));
chk('forged prescription link dropped',!prof.medications.find(m=>m.name==='Forged')?.prescriptionId);
// upload
const fd=new FormData(); fd.append('title','Chest X-ray'); fd.append('category','imaging'); fd.append('file',new Blob([Buffer.from('%PDF-1.4 test')],{type:'application/pdf'}),'x.pdf');
let u=await fetch(B+'/patient/reports',{method:'POST',headers:{Authorization:'Bearer '+ptoken},body:fd}); const uj=await u.json(); chk('upload pdf',u.status===201,JSON.stringify(uj));
const fd2=new FormData(); fd2.append('title','Fake image'); fd2.append('file',new Blob([Buffer.from('not a png')],{type:'image/png'}),'x.png');
u=await fetch(B+'/patient/reports',{method:'POST',headers:{Authorization:'Bearer '+ptoken},body:fd2}); chk('upload fake png rejected',u.status===400);
const fd3=new FormData(); fd3.append('title','Script'); fd3.append('file',new Blob(['<script>'],{type:'text/html'}),'x.html');
u=await fetch(B+'/patient/reports',{method:'POST',headers:{Authorization:'Bearer '+ptoken},body:fd3}); chk('upload html rejected',u.status===400);
let f=await fetch(B+'/files/report/'+uj.report._id,{headers:{Authorization:'Bearer '+ptoken}}); chk('owner downloads file',f.status===200);
