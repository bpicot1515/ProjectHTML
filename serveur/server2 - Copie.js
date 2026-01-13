var express = require('express'); //import de la bibliothèque Express
var app = express(); //instanciation d'une application Express

let i = 1;
let j = 1;
let create_room = true;
let create_user = true;
let room_exist = false;

let Rooms = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// setting up cross-origin policy
const cors = require('cors');
app.use(cors({
    origin: 'null'
}));

// Ici faut faire faire quelque chose à notre app...
// On va mettre les "routes"  == les requêtes HTTP acceptéés par notre application.
/*
app.get('/', function(req, res) {
    res.send('du texte');
});*/

app.get('/add_usr', function(req, res) {
    j=1
    create_user=true;
    if("r" in req.query && "user" in req.query) {
        for(var key in Rooms){
            if(Rooms[key].name==req.query.r){
                for(var usr in Rooms[key]){
                    j++;
                    if(Rooms[key][usr]==req.query.user){
                        create_user=false;
                    }
                }
                j--;
                if(create_user){
                    Rooms[key]["user"+j]=req.query.user;
                    res.send(true);
                }
                else{
                    throw(new Error("username déjà pris"));
                }
            }
        }
    } else {
        res.send("Pas de parametres")
    }
});

app.get('/join', function(req, res) {
    room_exist=false;
    if("r" in req.query) {
        for(var key in Rooms){
            if(Rooms[key].name==req.query.r){
                res.send(true);
                room_exist=true;
            }
        }
        if(!room_exist){
            throw(new Error("room n'existe pas"));
        }
    } else {
        res.send("Pas de parametres");
    }
})

app.get('/create', function(req, res) {
    create_room=true;
    if("r" in req.query && "user" in req.query) {
        for(var key in Rooms){
            if(Rooms[key].name==req.query.r){
                create_room=false;
            }
        }
        if(create_room){
            Rooms["room"+i]={};
            Rooms["room"+i].name=req.query.r;
            Rooms["room"+i]["user1"]=req.query.user;
            i++;
            res.send(true);
        }
        else{
            throw(new Error("room déjà existante"));
        }
    } else {
        res.send("Pas de parametres")
    }
});

app.get('/delete', function(req,res) {
    let roomname;
    let username;
    if("r" in req.query && "user" in req.query) {
        for(var key in Rooms){
            if(Rooms[key].name==req.query.r){
                roomname=key;
                break;
            }
        }
        for(var key in Rooms[roomname]){
            if(Rooms[roomname][key]==req.query.user){
                username=key;
                break;
            }
        }
        delete Rooms[roomname][username];
        if(Object.keys(Rooms[roomname]).length==1){
            delete Rooms[roomname];
        }
    }
});

app.get('/isroomvalid',function(req,res) {
    if("room" in req.query){
        for(var key in Rooms){
            if(Rooms[key].name == req.query.room){
                res.send(true);
            }
        }
        res.send(false);
    }
});

//app.get('/delete', function())

app.get('/json', function(req, res) {
    res.json(Rooms);
});

app.listen(8080); //commence à accepter les requêtes
console.log("App listening on port 8080...");