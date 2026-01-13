window.onbeforeunload = function(e) {
    e.preventDefault();
}

window.addEventListener('unload', function (e) {
    fetch('http://localhost:8080/delete?r='+localStorage.getItem('roomcode')+"&user="+localStorage.getItem('username'), {
            keepalive: true // this is important!
        });
    localStorage.clear();
});

const block = document.getElementById("Liste-joueur");
document.querySelector("#player-btn").addEventListener("click", function() {
    block.style.visibility="visible";
    document.getElementById("player-btn").style.visibility="hidden";
});
document.querySelector("#close-player-btn").addEventListener("click", function() {
    block.style.visibility="hidden";
    document.getElementById("player-btn").style.visibility="visible";
});

const backBtn = document.getElementById("back-btn");
backBtn.addEventListener("click", function() {
    window.location.href = "Index.html";
});

const copyBtn = document.getElementById("copy-btn");
copyBtn.addEventListener("click", function() {
    text = document.getElementById("code-box").textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert("Code copié : " + text);
    }).catch(() => {
        alert("Impossible de copier le code !");
    });
});

let currentGameState = "waiting"; // Pour détecter les changements d'état

// --- MODIF: start-btn sert aussi de bouton "Next" ---
const startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", function() {
    fetch('http://localhost:8080/start?r=' + localStorage.getItem('roomcode'));
    // Si on était en mode résultat, on remet le bouton en mode caché/attente
    startBtn.style.display = "none"; 
});

function updateInfo(){
    let roomCode = localStorage.getItem('roomcode');
    if(!roomCode) return;

    fetch('http://localhost:8080/part?room=' + roomCode)
    .then(response => response.json())
    .then(roomData => {
        if (roomData == false) return;

        // Mise à jour liste joueurs (inchangé)
        const listeuser = document.getElementById("users");
        listeuser.innerHTML = "";
        if(roomData.users && Array.isArray(roomData.users)){
            roomData.users.forEach(u => {
                let li = document.createElement("li");
                li.textContent = u;
                listeuser.appendChild(li);
            });
        }

        // --- LOGIQUE JEU ---
        
        // 1. Passage en mode VOTE (Nouvelle question)
        if(roomData.state === "voting") {
            // Afficher le bouton Start/Next uniquement pour le créateur si on attend
            // Mais ici on le cache pendant le vote
            document.getElementById("start-btn").style.display = "none";

            if(currentGameState !== "voting" || document.querySelector(".question").textContent !== roomData.currentQuestion){
                currentGameState = "voting";
                launchGameUI(roomData.currentQuestion, roomData.users);
            }
            
            // Mise à jour du Chrono
            let timerDisplay = document.getElementById("timer-display");
            if(timerDisplay) timerDisplay.textContent = "Temps restant : " + roomData.timeLeft + "s";
        }

        // 2. Passage en mode RÉSULTAT
        if(roomData.state === "result" && currentGameState !== "result") {
            currentGameState = "result";
            showResultUI(roomData.lastWinner);
            
            // Réafficher le bouton "Question Suivante" (Start)
            document.getElementById("start-btn").style.display = "block"; 
            document.getElementById("start-btn").textContent = "Question Suivante";
        }
    });
}

function launchGameUI(questionText, usersList) {
    // Nettoyage complet zone de jeu
    let oldRep = document.querySelector(".reponses");
    if(oldRep) oldRep.remove();
    let oldRes = document.querySelector(".resultat-box");
    if(oldRes) oldRes.remove();
    let oldQ = document.querySelector(".question");
    if(oldQ) oldQ.remove();
    
    // Nettoyage Lobby
    if(document.getElementById("indication")) document.getElementById("indication").remove();
    if(document.getElementById("code-box")) document.getElementById("code-box").remove();
    document.getElementById("foot").style.visibility = "visible";
    document.getElementById("bienvenue").textContent = "À vous de voter !";

    // Affichage Question
    let qElement = document.createElement("p");
    qElement.className = "question";
    qElement.textContent = questionText;
    document.getElementById("bienvenue").after(qElement);

    // Affichage Chrono
    let timer = document.getElementById("timer-display");
    if(!timer) {
        timer = document.createElement("h2");
        timer.id = "timer-display";
        timer.style.color = "red";
        document.getElementById("bienvenue").after(timer);
    }

    // Affichage Boutons
    let repDiv = document.createElement("div");
    repDiv.className = "reponses";

    usersList.forEach(user => {
        let btn = document.createElement("button");
        btn.className = "btn btn-rep";
        btn.textContent = user;
        btn.onclick = function() {
            // Envoi du vote
            let room = localStorage.getItem('roomcode');
            let me = localStorage.getItem('username');
            fetch(`http://localhost:8080/vote?r=${room}&user=${me}&vote=${user}`);
            
            // Feedback visuel
            btn.style.backgroundColor = "green";
            // Désactiver les autres boutons
            let allBtns = document.querySelectorAll(".btn-rep");
            allBtns.forEach(b => b.disabled = true);
        };
        repDiv.appendChild(btn);
    });

    document.querySelector(".button-container").before(repDiv);
}

function showResultUI(winnerName) {
    // Supprimer les boutons de vote
    let repDiv = document.querySelector(".reponses");
    if(repDiv) repDiv.remove();
    
    // Supprimer le chrono
    let timer = document.getElementById("timer-display");
    if(timer) timer.remove();

    document.getElementById("bienvenue").textContent = "Le résultat est...";

    let resBox = document.createElement("div");
    resBox.className = "resultat-box";
    resBox.innerHTML = `<h1>🏆 ${winnerName} 🏆</h1>`;
    resBox.style.textAlign = "center";
    resBox.style.fontSize = "2em";
    resBox.style.padding = "20px";
    
    document.querySelector(".button-container").before(resBox);
}
function main(){
    // 1. GESTION DU CODE DE LA ROOM
    if(!localStorage.getItem('roomcode')){
        // Si pas de code, on en génère un et on crée la room sur le serveur
        let code = "";
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        
        // Génération simple
        for (let i = 0; i < 5; i++) {
            code += letters[Math.floor(Math.random()*26)];
        }

        // Création côté serveur
        fetch('http://localhost:8080/create?r='+code+"&user="+localStorage.getItem('username'))
        .then(response => response.text())
        .then(data => {
            // Si la création échoue (code pris), on recharge la page pour réessayer
            if(data !== "true"){
                localStorage.removeItem('roomcode');
                location.reload();
            }
        });

        localStorage.setItem('roomcode', code);
        document.getElementById("code-box").textContent = code;
    }
    else{
        // Si on a déjà un code (ex: on a rejoint ou rafraichi), on l'affiche
        let text = localStorage.getItem('roomcode');
        document.getElementById("code-box").textContent = text;
    }

    // 2. MISE A JOUR DU FOOTER
    document.getElementById("code").textContent = localStorage.getItem('roomcode');

    // 3. LANCEMENT DE LA BOUCLE DE JEU (C'est elle qui va gérer l'affichage Lobby vs Jeu)
    // On appelle updateInfo immédiatement une fois pour éviter d'attendre 1 seconde
    updateInfo(); 
    setInterval(updateInfo, 1000);
}

main();