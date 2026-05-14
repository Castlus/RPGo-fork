// 1. Imports
import { supabase } from './utils/api.js';

// 3. Elementos da Tela
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('password');
const confirmaSenhaInput = document.getElementById('confirmPassword');
const btnLogin = document.getElementById('btnLogin');
const btnCriar = document.getElementById('btnCriarConta');

const authToast = document.getElementById('authToast');
const toastMessage = document.getElementById('toastMessage');
const closeToast = document.getElementById('closeToast');

if(closeToast) {
    closeToast.addEventListener('click', () => {
        authToast.classList.remove('show');
    });
}

// 4. Tradução de erros Supabase → mensagens em português
function traduzirErro(mensagem = '') {
    const m = mensagem.toLowerCase();
    if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
        return 'E-mail ou senha incorretos.';
    if (m.includes('email not confirmed'))
        return 'Confirme seu e-mail antes de entrar.';
    if (m.includes('user already registered') || m.includes('already been registered'))
        return 'Este e-mail já está cadastrado.';
    if (m.includes('password should be at least'))
        return 'Senha muito fraca (mínimo 6 caracteres).';
    if (m.includes('rate limit') || m.includes('too many requests'))
        return 'Muitas tentativas. Tente novamente mais tarde.';
    if (m.includes('failed to fetch') || m.includes('network'))
        return 'Sem conexão com a internet.';
    if (m.includes('invalid email'))
        return 'E-mail inválido.';
    return 'Ocorreu um erro. Tente novamente.';
}

function setLoading(ativo) {
    btnLogin.disabled = ativo;
    btnCriar.disabled = ativo;
    btnLogin.textContent = ativo ? 'Aguarde...' : 'Entrar';
}

function mostrarErro(msg, cor = '#e74c3c') {
    if (!msg) {
        authToast.classList.remove('show');
        return;
    }
    authToast.style.borderLeftColor = cor;
    toastMessage.innerText = msg;
    authToast.classList.add('show');
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
    btnLogin.addEventListener('click', async () => {
        mostrarErro('');
        if (!validarCampos(emailInput, senhaInput)) return;

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: senhaInput.value
        });
        if (error) {
            mostrarErro(traduzirErro(error.message));
            setLoading(false);
        }
        // Redirecionamento fica a cargo do onAuthStateChange abaixo
    });
}

// 6. Botão de Criar Conta
if (btnCriar) {
    btnCriar.addEventListener('click', async () => {
        mostrarErro('');
        if (!validarCampos(emailInput, senhaInput, confirmaSenhaInput)) return;

        if (senhaInput.value !== confirmaSenhaInput.value) {
            mostrarErro('As senhas não coincidem.');
            confirmaSenhaInput.focus();
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: emailInput.value.trim(),
            password: senhaInput.value
        });
        if (error) {
            mostrarErro(traduzirErro(error.message));
            setLoading(false);
        } else if (data?.user && !data?.session) {
            // Conta criada, mas precisa confirmar email
            mostrarErro('Conta criada! Verifique seu e-mail para confirmar.', 'green');
            setLoading(false);
        } else if (data?.session) {
            // Em caso de signup que faz login direto, o listener cuida do redirect
            msgErro.style.color = 'green';
            msgErro.innerText = 'Conta criada com sucesso!';
        }
    });
}

// 7. Observador — redireciona após login/cadastro bem-sucedido
let redirecionando = false;
supabase.auth.onAuthStateChange((event, session) => {
    if (redirecionando) return;
    if (event !== 'SIGNED_IN') return;
    if (!session?.user) return;

    redirecionando = true;
    setLoading(false);
    window.location.href = 'dashboard.html';
});
