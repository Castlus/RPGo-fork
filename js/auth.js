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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// 3. Elementos da Tela
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('password');
const confirmaSenhaInput = document.getElementById('confirmPassword');
const btnLogin = document.getElementById('btnLogin');
const btnCriar = document.getElementById('btnCriarConta');
const msgErro = document.getElementById('msgErro');

// 4. Mapa de erros Firebase → mensagens em português
const ERROS = {
    'auth/invalid-email':            'E-mail inválido.',
    'auth/user-not-found':           'Usuário não encontrado.',
    'auth/wrong-password':           'Senha incorreta.',
    'auth/invalid-credential':       'E-mail ou senha incorretos.',
    'auth/email-already-in-use':     'Este e-mail já está cadastrado.',
    'auth/weak-password':            'Senha muito fraca (mínimo 6 caracteres).',
    'auth/too-many-requests':        'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed':   'Sem conexão com a internet.',
};

function traduzirErro(codigo) {
    return ERROS[codigo] || 'Ocorreu um erro. Tente novamente.';
}

function setLoading(ativo) {
    btnLogin.disabled = ativo;
    btnCriar.disabled = ativo;
    btnLogin.textContent = ativo ? 'Aguarde...' : 'Entrar';
}

function mostrarErro(msg) {
    msgErro.innerText = msg;
}

function validarCampos(...campos) {
    for (const campo of campos) {
        if (!campo.value.trim()) {
            mostrarErro('Preencha todos os campos.');
            campo.focus();
            return false;
        }
    }
    return true;
}

// 5. Botão de Login
if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        mostrarErro('');
        if (!validarCampos(emailInput, senhaInput)) return;

        setLoading(true);
        signInWithEmailAndPassword(auth, emailInput.value.trim(), senhaInput.value)
            .catch(erro => {
                console.error(erro);
                mostrarErro(traduzirErro(erro.code));
                setLoading(false);
            });
    });
}

// 6. Botão de Criar Conta
if (btnCriar) {
    btnCriar.addEventListener('click', () => {
        mostrarErro('');
        if (!validarCampos(emailInput, senhaInput, confirmaSenhaInput)) return;

        if (senhaInput.value !== confirmaSenhaInput.value) {
            mostrarErro('As senhas não coincidem.');
            confirmaSenhaInput.focus();
            return;
        }

        setLoading(true);
        createUserWithEmailAndPassword(auth, emailInput.value.trim(), senhaInput.value)
            .catch(erro => {
                console.error(erro);
                mostrarErro(traduzirErro(erro.code));
                setLoading(false);
            });
    });
}

// 7. Observador — redireciona após login/cadastro bem-sucedido
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Usuário logado:', user.uid);
        const userRef = ref(db, 'users/' + user.uid);

        get(userRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    window.location.href = 'ficha.html';
                } else {
                    window.location.href = 'criacao-personagem.html';
                }
            })
            .catch((erro) => {
                console.error('Erro ao verificar ficha:', erro);
                mostrarErro('Erro ao verificar dados. Tente novamente.');
                setLoading(false);
            });
    }
});
