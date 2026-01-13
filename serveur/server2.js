var fs = require('fs');
var express = require('express'); 
var app = express(); 
var cors = require('cors');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));

// --- 1. CHARGEMENT DES QUESTIONS (Au démarrage) ---
var questionsList = [];
try {
    // TENTATIVE 1 : Si le fichier est dans le dossier parent "Page web" (selon ton tree)
    // Chemin relatif depuis le dossier "serveur" vers "Page web/Question.txt"
    var chemin = '../Page web/Question.txt';
    
    // Si le fichier n'existe pas là, on essaie juste dans le dossier parent
    if (!fs.existsSync(chemin)) {
        chemin = '../Question.txt';
    }
    // Si toujours pas, on essaie dans le dossier courant
    if (!fs.existsSync(chemin)) {
        chemin = 'Question.txt';
    }

    console.log("Chargement des questions depuis : " + chemin);
    var data = fs.readFileSync(chemin, 'utf8');
    questionsList = data.split('\n').filter(line => line.trim() !== '');
    console.log(questionsList.length + " questions chargées.");

} catch(e) {
    console.error("ERREUR CRITIQUE : Impossible de lire Question.txt. Vérifiez le chemin !");
    console.error(e.message);
    // On met une question par défaut pour éviter le crash 500
    questionsList = ["Qui est le plus cool ?", "Qui va payer sa tournée ?"];
}

// --- 2. VARIABLES GLOBALES ---
let i = 1;
let Rooms = {};

// --- 3. FONCTIONS UTILITAIRES ---
function getWinner(votes) {
    if (!votes || Object.keys(votes).length === 0) return "Personne";
    let counts = {};
    let max = 0;
    let winner = "Egalité";
    
    for (let user in votes) {
        let target = votes[user];
        counts[target] = (counts[target] || 0) + 1;
        if (counts[target] > max) {
            max = counts[target];
            winner = target;
        }
    }
    return winner + " (" + max + " votes)";
}

// --- 4. ROUTES ---

// ROUTE : Créer une room
app.get('/create', function(req, res) {
    let create_room = true;
    if("r" in req.query && "user" in req.query) {
        for(var key in Rooms){
            if(Rooms[key].name == req.query.r) create_room = false;
        }
        if(create_room){
            Rooms["room"+i] = {
                name: req.query.r,
                users: [req.query.user],
                state: "waiting",       // waiting, voting, result
                currentQuestion: "",
                votes: {},
                timerEnd: 0,
                lastWinner: ""
            };
            i++;
            res.send("true");
        } else {
            res.send("false");
        }
    } else {
        res.send("Pas de parametres");
    }
});

// ROUTE : Démarrer le jeu / Question suivante
app.get('/start', function(req, res) {
    if("r" in req.query) {
        let roomKey = Object.keys(Rooms).find(k => Rooms[k].name === req.query.r);
        
        if(roomKey){
            // Réinitialisation pour le vote
            Rooms[roomKey].state = "voting";
            Rooms[roomKey].votes = {};
            Rooms[roomKey].timerEnd = Date.now() + 20000; // 20 secondes
            
            // Choix d'une question aléatoire
            if(questionsList.length > 0) {
                let rand = Math.floor(Math.random() * questionsList.length);
                Rooms[roomKey].currentQuestion = questionsList[rand];
            } else {
                Rooms[roomKey].currentQuestion = "Erreur: Pas de questions chargées";
            }
            
            console.log("Room " + req.query.r + " : Nouvelle question -> " + Rooms[roomKey].currentQuestion);
            res.send(true);
        } else {
            console.log("Erreur start: Room introuvable " + req.query.r);
            res.status(404).send(false);
        }
    } else {
        res.status(400).send(false);
    }
});

// ROUTE : Récupérer l'état (Polling)
app.get('/part', function(req, res) {
    let room_exist = false;
    if("room" in req.query){
        for(var key in Rooms){
            if(Rooms[key].name == req.query.room){
                
                // LOGIQUE AUTO : Fin du timer
                if(Rooms[key].state === "voting" && Date.now() > Rooms[key].timerEnd){
                    Rooms[key].state = "result";
                    Rooms[key].lastWinner = getWinner(Rooms[key].votes);
                }

                // Calcul du temps restant
                let timeLeft = Math.max(0, Math.ceil((Rooms[key].timerEnd - Date.now()) / 1000));
                
                // On envoie une COPIE de l'objet + le timeLeft
                let responseData = { ...Rooms[key], timeLeft: timeLeft };
                
                res.send(responseData);
                room_exist = true;
                break;
            }
        }
        if(!room_exist) res.send(false);
    } else {
        res.send(false);
    }
});

// ROUTE : Voter
app.get('/vote', function(req, res) {
    if("r" in req.query && "user" in req.query && "vote" in req.query){
        let roomKey = Object.keys(Rooms).find(k => Rooms[k].name === req.query.r);
        if(roomKey && Rooms[roomKey].state === "voting"){
            if(!Rooms[roomKey].votes) Rooms[roomKey].votes = {};
            
            Rooms[roomKey].votes[req.query.user] = req.query.vote;
            console.log(req.query.user + " a voté pour " + req.query.vote);
            res.send(true);
        } else {
            res.send(false);
        }
    } else {
        res.send(false);
    }
});

// ROUTE : Rejoindre (Vérifie juste l'existence)
app.get('/join', function(req, res) {
    let found = Object.values(Rooms).some(r => r.name == req.query.r);
    res.send(found);
});

// ROUTE : Ajouter un utilisateur (quand il rejoint)
app.get('/add_usr', function(req, res) {
    let create_user = true;
    if("r" in req.query && "user" in req.query) {
        let roomKey = Object.keys(Rooms).find(k => Rooms[k].name === req.query.r);
        if(roomKey){
            if(Rooms[roomKey].users.includes(req.query.user)){
                create_user = false;
            }
            if(create_user){
                Rooms[roomKey].users.push(req.query.user);
                res.send(true);
            } else {
                // Pseudo déjà pris, on renvoie false (ou erreur)
                res.send(false); 
            }
        } else {
            res.send(false);
        }
    } else {
        res.send("Pas de parametres");
    }
});

// ROUTE : Supprimer/Quitter
app.get('/delete', function(req, res) {
    if("r" in req.query && "user" in req.query) {
        let roomKey = Object.keys(Rooms).find(k => Rooms[k].name === req.query.r);
        if(roomKey){
            const index = Rooms[roomKey].users.indexOf(req.query.user);
            if(index > -1) {
                Rooms[roomKey].users.splice(index, 1);
            }
            // Si plus personne, on supprime la room
            if(Rooms[roomKey].users.length === 0){
                delete Rooms[roomKey];
                console.log("Room supprimée : " + req.query.r);
            }
        }
    }
    res.send(true);
});

// Démarrage
app.listen(8080);
console.log("Serveur démarré sur le port 8080...");