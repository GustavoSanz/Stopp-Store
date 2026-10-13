# Stopp App Store

Portal oficial de distribuicao de aplicacoes moveis, ferramentas e projetos experimentais desenvolvidos por **Stopp** (Gustavo Sanz).

---

## Aplicacoes em Destaque

1. **Vera Watt (v0.3-Beta)**:
   - Plataforma de gestao energetica residencial inteligente.
   - Desenvolvida em Kotlin com Jetpack Compose (UI declarativa com Glassmorphism).
   - Integracao nativa de hardware com a interface LED do **Nothing Phone (2a)** atraves do Nothing Glyph Matrix SDK 2.0.
   - Ficheiro APK disponivel diretamente na pasta `assets/apks/`.

2. **Son of Echoes (v1.2)**:
   - Aplicacao companheira e radar para Sons of the Forest.
   - Mapas interativos de sobrevivencia, localizacao de bunkers e base de dados de crafting.

3. **Stopp Experimental Lab**:
   - Espaco reservado para futuras ferramentas e projetos de software.

---

## Como Publicar no GitHub e Ativar o GitHub Pages (24/7 Online)

1. **Criar o Repositorio no GitHub:**
   - No GitHub, cria um novo repositorio com o nome `stopp-store` (ou `stopp-apps`).
   - Associa este repositorio local com os seguintes comandos nesta pasta:
     ```bash
     git remote add origin https://github.com/OTEUGITHUB/stopp-store.git
     git branch -M main
     git push -u origin main
     ```

2. **Ativar o GitHub Pages (Alojamento Gratuito):**
   - No teu repositorio no GitHub, vai a **Settings** (Definicoes) > **Pages**.
   - Em **Build and deployment > Source**, escolhe **Deploy from a branch**.
   - Em **Branch**, seleciona `main` e a pasta `/ (root)`.
   - Clica em **Save**.
   - Em 1 minuto, a tua loja fica online num endereco oficial (ex: `https://oteuuser.github.io/stopp-store/`) acessivel de qualquer telemovel no mundo sem depender do XAMPP ou do computador ligado!

---

## Estrutura do Projeto

```text
Stopp-Store/
├── index.html              # Interface principal com Glassmorphism
├── assets/
│   ├── css/
│   │   └── style.css       # Estilos visuais Apple / Nothing OS inspired
│   ├── js/
│   │   └── app.js          # Logica interativa de filtros
│   └── apks/
│       └── VeraWatt-v0.3-Beta.apk   # Ficheiro instalavel da versao mais recente
├── .gitignore              # Ficheiros ignorados pelo Git
└── README.md               # Documentacao do repositorio
```
