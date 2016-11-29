//imports
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const url = 'mongodb://localhost:27017/cpm'; //points to the database we'll be using to read/write too

/*
1. Login Existing: GoogleID matches one in DB, return userinfo
2. Login New: GoogleID doesn't exist, create and return new user
*/
let login = function(creds){
    return new Promise((resolve,reject) => {
        MongoClient.connect(url, (err,db) => { 
            if(err) {
                console.log("error");
                reject(err);
            }
            let coll = db.collection("users"); //pre-defined collection users
            //inserts new user into the collection "users" one by one   
            //console.log("Creds: ", creds.googleID);
            coll.findOne({googleID : creds.googleID}).then((res) =>{
                console.log("Login Response: ", res);
                //if google id not found, then make a new user
                if(!res){
                    let user = {
                        "googleID" : creds.googleID, 
                        "name" : "", 
                        "email" : "", 
                        "conferences" : "" 
                    }
                    //console.log("adding user: ", user)
                    coll.insertOne(user, function(err, doc){
                        if(err){
                            console.log("error insering doc: ", err);
                            db.close();
                            reject(err);
                        } 
                        console.log('user added: ', doc.ops[0])
                        db.close();
                        resolve(doc.ops[0]);
                    });
                } else {
                    console.log("login successful: ", res)
                    db.close();
                    resolve(res);
                }
            }); 
        });
    });
}

let addEvent = function(conf){
    //{userid: ___, confname:____, etc}
    //MAKE SURE USERID ALREADY IN ATTENDING FOR CONFERENCE
    return new Promise(function(resolve, reject){
        MongoClient.connect(url, (err, db) => {
            if(err) reject(err);

            //update admin with having added conference
            let usersColl = db.collection("users");
            //add conference
            let confColl = db.collection("conferences");
            conf["attendees"] = conf.organizer;

            confColl.insert(conf, function(err, doc){ //adds the conference
                console.log("added conf: ", doc);
                let docID = doc.insertedIds[0];
                let adminID = conf.organizer;
                usersColl.find({"googleID" : conf.organizer}, (err, user) => {
                    if(err) reject(err);
                    let attending = user.conferences;
                    if(attending === ""){
                        attending = docID;
                    } else {
                        attending = attending + "," + docID;
                    }
                    //attending.push(docID); //user is attending this conf
                    usersColl.update({ "googleID" : conf.organizer} , { $set: { "conferences" : attending } }); 
                    console.log('conf added')
                    resolve({success: true});
                });    
            });
            db.close();
        });
    });
}

//needs to have .then cause find() is promise
let getEventById = function(confid){
    return new Promise(function(resolve,reject){
        MongoClient.connect(url, (err, db) => {
            if(err) reject(err);
            let coll = db.collection("conferences");
            coll.findOne({"_id": ObjectID(confid)}, function(err, doc){
                console.log('returning event ' , res)           
                db.close();
                resolve(res); //return doc
            });
        });
    })
}

let getEventByName = function(confName){
    return new Promise(function(resolve, reject){
        MongoClient.connect(url, (err,db) => {
            if(err) reject(err);
            let confColl = db.collection("conferences");
            /*
            confColl.find({eventName: confName}).then(function(docs){
                console.log('returning docs by name: ', docs);
                db.close();
                resolve(docs);
            })
            */
            /**/
            confColl.findOne({eventName: confName}, function(err, docs){
                if(err) reject(err);
                //if(!docs) resolve({"success":false});
                console.log('returning events by name', docs);
                db.close();
                resolve(docs);
            });
            
        });
    });
}

let getAllEvents = function(){
    return new Promise(function(resolve, reject){
        MongoClient.connect(url, (err, db) => {
            if(err) reject(err);
            let confColl = db.collection("conferences");
            confColl.find({}, function(err, res){
                console.log('returning all events:', res);
                db.close();
                resolve(res);
            });    
        });
    });
}

let joinEvent = function(joinreq){
    /*{
        userID: ____,
        confID: ____
    }*/

    MongoClient.connect(url, (err, db) => {
        if(err) throw err;
        let confColl = db.collection("conferences");
        let userColl = db.collection("users");
        
        //add user to conf's attendees
        confColl.find({"_id":ObjectId(joinreq.confID)}, function(err, conf){
            if(err) reject(err);
            conf.attendees = conf.attendees + "," + joinreq.userID;
            confColl.update({"_id":ObjectID(joinreq.confID)}, 
                {$set: {"attendees": conf.attendees}});
        });

        //add conf to user's atttending
        userColl.find({"_id":ObjectID(joinreq.userID), function(err, user){
            if(err) reject(err);
            if(user.conferences === ""){
                user.conferences = joinreq.confID;
            } else {
                user.conferences = user.conferences + "," + joinreq.confID;
            }
            userColl.update({"_id":Object(joinreq.userID)}, 
            { $set: {conferences: user.conferences}});            
        }});
        db.close();        
    });
}


let updateEvent = function(conf){
    return new Promise(function(resolve,reject){
        MongoClient.connect(url, (err, db) => {
            if(err) reject(err);
            let coll = db.collection("conferences");
            coll.updateOne({"_id" : ObjectID(conf.id)},conf).then((res)=>{
                resolve(res); //return {ackowledged, etc}
            });
        });
    })
}

let updateUser = function(usr){
    return new Promise(function(resolve, reject){
        MongoClient.connect(url, (err, db) => {
            if(err) throw err;
            let coll = db.collection("users");
            coll.updateOne({"googleID" : ObjectID(usr.id)}, usr).then((res)=>{
                return res; //return {ackowledged, etc}
            });
        });
    })
}

let leaveEvent = function(leavereq){
    /*{
        userid: ____,
        usergroup: "",
        confid: ____
    }*/

    MongoClient.connect(url, (err, db) => {
        if(err) throw err;
        let coll = db.collection("conferences");
        
    });
}


module.exports = {
    login : login,
    addEvent : addEvent,
    getEventById : getEventById,
    getEventByName : getEventByName,
    getAllEvents : getAllEvents,
    updateEvent : updateEvent,
    updateUser : updateUser,
    joinEvent : joinEvent,
    leaveEvent : leaveEvent
}

/*let addUser = function(user){
    return new Promise(function(resolve,reject){
        MongoClient.connect(url, (err, db) => {
            if(err) reject(err);
            let coll = db.collection("users");
            coll.insertOne(user).then((res)=>{
                console.log('user added ', res)
                resolve(res); //return {acknowledged: true, objectid: "some id"}
            });
        });
    })
}*/