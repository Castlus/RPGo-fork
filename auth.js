// 1. Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. Configuração
const firebaseConfig = {
  apiKey: "AIzaSyBkp8ZUYMCfRokbpMl2fBGTvfMxzzvgaeY",
  authDomain: "rpgo-onepiece.firebaseapp.com",
  databaseURL: "https://rpgo-onepiece-default-rtdb.firebaseio.com",
  projectId: "rpgo-onepiece",
  storageBucket: "rpgo-onepiece.firebasestorage.app",
  messagingSenderId: "726770644982",
  appId: "1:726770644982:web:7c06f46940cc5142c3f9d7",
  measurementId: "G-HSBMTMB5XK"
};

// ==========================================================
// 3. INICIALIZAÇÃO (ISSO ESTAVA FALTANDO!)
// Sem isso, o 'auth' e o 'db' não existem.
// ==========================================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// 4. Elementos da Tela
const emailInput = document.getElementById('email');
// ATENÇÃO: No seu HTML o id é "password", aqui estava "senha". Corrigi para baterem.
const senhaInput = document.getElementById('password'); 
const btnLogin = document.getElementById('btnLogin');
const btnCriar = document.getElementById('btnCriarConta');
const msgErro = document.getElementById('msgErro');

// 5. Botão de Login
if(btnLogin) {
    btnLogin.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, emailInput.value, senhaInput.value)
            .catch(erro => {
                console.error(erro); // Mostra o erro no console (F12)
                msgErro.innerText = "Erro ao entrar: " + erro.message;
            });
    });
}

// 6. Botão de Criar Conta
if(btnCriar) {
    btnCriar.addEventListener('click', () => {
        createUserWithEmailAndPassword(auth, emailInput.value, senhaInput.value)
            .catch(erro => {
                console.error(erro);
                msgErro.innerText = "Erro ao criar: " + erro.message;
            });
    });
}

// 7. Observador (Redirecionamento Automático)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado!
        console.log("Usuário logado:", user.uid);
        
        const userRef = ref(db, 'users/' + user.uid);
        
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                // Se já tem ficha salva, vai pro jogo
                window.location.href = "ficha.html";
            } else {
                // Se não tem ficha, vai pra criação
                // Atenção: verifique se o nome do seu arquivo HTML é este mesmo
                window.location.href = "criacao-personagem.html";
            }
        });
    }
});