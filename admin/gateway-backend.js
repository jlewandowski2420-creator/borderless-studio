/* ==========================================================================
   Borderless Studio — custom Decap CMS backend
   --------------------------------------------------------------------------
   The site is edited through a small custom gateway (not Netlify's
   git-gateway), so we register our own Decap backend that speaks its protocol:

     • Auth:  POST { password }                     -> { token }
     • Read:  POST { action:'get',  ...repo, path } -> { content, sha }   (Bearer)
     • Write: POST { action:'save', ...repo, path, content, message }     (Bearer)

   "...repo" = { repo, owner, branch } identifying the target repository.
   The gateway commits/pushes to GitHub; GitHub Pages redeploys within ~30s.

   Collections in admin/index.html are "files" collections with explicit
   paths, so Decap only ever asks us to read/write known files — we never
   need a directory listing.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Gateway contract (edit here if your gateway differs) ---- */
  var GATEWAY_URL = 'https://sparklewash.nl/oauth/gateway.php';
  var AUTH_URL = 'https://sparklewash.nl/oauth/auth';  // separate auth endpoint
  var REPO = {
    repo: 'borderless-studio',
    owner: 'jlewandowski2420-creator',
    branch: 'master'
  };
  var BACKEND_NAME = 'borderless-gateway';

  /* ---- low-level POST helper ---- */
  function post(body, token) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(GATEWAY_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var json;
        try { json = text ? JSON.parse(text) : {}; }
        catch (e) { json = { raw: text }; }
        if (!res.ok) {
          var msg = (json && (json.error || json.message)) || ('Gateway HTTP ' + res.status);
          throw new Error(msg);
        }
        return json;
      });
    });
  }

  function repoBody(extra) {
    var body = { repo: REPO.repo, owner: REPO.owner, branch: REPO.branch };
    if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
    return body;
  }

  function pathOf(file) {
    if (!file) return null;
    if (typeof file === 'string') return file;
    if (file.path) return file.path;
    if (typeof file.get === 'function') return file.get('path'); // Immutable
    return null;
  }

  /* ---- login page (stateless React component via the exposed window.h) ---- */
  function authComponent() {
    var h = window.h || (window.CMS && window.CMS.h);

    var wrap = {
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0A0A0A', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif'
    };
    var card = {
      width: '320px', maxWidth: '90vw', padding: '32px', borderRadius: '16px',
      background: '#141414', border: '1px solid #262626', boxShadow: '0 20px 60px rgba(0,0,0,.5)'
    };
    var titleStyle = { margin: '0 0 6px', fontSize: '20px', fontWeight: 700 };
    var subStyle = { margin: '0 0 20px', fontSize: '13px', color: '#A0A0A0' };
    var inputStyle = {
      width: '100%', boxSizing: 'border-box', padding: '11px 13px', marginBottom: '14px',
      borderRadius: '9px', border: '1px solid #333', background: '#0d0d0d', color: '#fff',
      fontSize: '14px', outline: 'none'
    };
    var btnStyle = {
      width: '100%', padding: '11px', borderRadius: '9px', border: 'none', cursor: 'pointer',
      background: 'linear-gradient(90deg,#6C5CE7,#00D2FF)', color: '#fff', fontWeight: 600, fontSize: '14px'
    };
    var errStyle = { margin: '0 0 14px', fontSize: '13px', color: '#FF6B6B' };

    return function AuthenticationPage(props) {
      function submit() {
        var el = document.getElementById('bs-gw-pw');
        var pw = el ? el.value : '';
        if (!pw) return;
        // Decap forwards these "credentials" to implementation.authenticate().
        props.onLogin({ password: pw });
      }
      return h('div', { style: wrap },
        h('div', { style: card },
          h('h1', { style: titleStyle }, 'Borderless Studio CMS'),
          h('p', { style: subStyle }, 'Enter the gateway password to edit site content.'),
          props.error ? h('p', { style: errStyle }, String(props.error)) : null,
          h('input', {
            id: 'bs-gw-pw', type: 'password', placeholder: 'Gateway password',
            style: inputStyle, autoFocus: true,
            onKeyDown: function (e) { if (e.key === 'Enter') submit(); }
          }),
          h('button', {
            type: 'button', style: btnStyle, disabled: !!props.inProgress, onClick: submit
          }, props.inProgress ? 'Signing in…' : 'Log in')
        )
      );
    };
  }

  /* ---- backend implementation ---- */
  function BorderlessGatewayBackend(config, options) {
    this.config = config;
    this.options = options || {};
    this.token = null;
  }

  var proto = BorderlessGatewayBackend.prototype;

  proto.authComponent = function () { return authComponent(); };

  proto.authenticate = function (credentials) {
    var self = this;
    var password = credentials && (credentials.password ||
      (typeof credentials.get === 'function' && credentials.get('password')));
    if (!password) return Promise.reject(new Error('Password required'));
    return post({ password: password }).then(function (json) {
      if (!json.token) throw new Error('Gateway did not return a token');
      self.token = json.token;
      return {
        token: json.token,
        backendName: BACKEND_NAME,
        login: 'editor',
        name: 'Borderless Editor'
      };
    });
  };

  proto.restoreUser = function (user) {
    var token = user && (user.token || (typeof user.get === 'function' && user.get('token')));
    if (!token) return Promise.reject(new Error('No stored session'));
    this.token = token;
    return Promise.resolve(user);
  };

  proto.logout = function () { this.token = null; return null; };
  proto.getToken = function () { return Promise.resolve(this.token); };

  proto.status = function () {
    return Promise.resolve({ auth: { status: true }, api: { status: true, statusPage: '' } });
  };

  /* read one file -> { data, sha } */
  proto.getFile = function (path) {
    return post(repoBody({ action: 'get', path: path }), this.token).then(function (json) {
      var content = json.content;
      if (content == null && json.data != null) {
        content = typeof json.data === 'string' ? json.data : JSON.stringify(json.data, null, 2);
      }
      return { data: content == null ? '' : content, sha: json.sha || json.id || null };
    });
  };

  proto.getEntry = function (path) {
    return this.getFile(path).then(function (f) {
      return { file: { path: path, id: f.sha }, data: f.data };
    });
  };

  proto.entriesByFiles = function (files) {
    var self = this;
    var list = files && typeof files.toJS === 'function' ? files.toJS() : (files || []);
    return Promise.all(list.map(function (file) {
      var path = pathOf(file);
      return self.getFile(path).then(function (f) {
        return { file: { path: path, id: f.sha, label: file && file.label }, data: f.data };
      }).catch(function () {
        // A not-yet-created file shows up as a new, empty entry.
        return { file: { path: path, id: null }, data: '' };
      });
    }));
  };

  proto.entriesByFolder = function () { return Promise.resolve([]); };
  proto.allEntriesByFolder = function () { return Promise.resolve([]); };

  /* write — Decap v3 passes { dataFiles: [{ path, raw, slug }], assets } */
  proto.persistEntry = function (entry, options) {
    var self = this;
    options = options || {};
    var dataFiles = entry && entry.dataFiles;
    if (!dataFiles || !dataFiles.length) {
      var p = pathOf(entry) || (entry && typeof entry.get === 'function' && entry.get('path'));
      var raw = (entry && entry.raw) || (entry && typeof entry.get === 'function' && entry.get('raw'));
      dataFiles = [{ path: p, raw: raw }];
    }
    var message = options.commitMessage || 'Update site content via Borderless CMS';
    return Promise.all(dataFiles.map(function (df) {
      var path = df.path || pathOf(df);
      return post(repoBody({ action: 'save', path: path, content: df.raw, message: message }), self.token);
    })).then(function () { return undefined; });
  };

  /* media — the gateway only manages text content */
  proto.getMedia = function () { return Promise.resolve([]); };
  proto.getMediaFile = function (path) {
    return Promise.resolve({ id: path, name: path.split('/').pop(), path: path, url: path, displayURL: path });
  };
  proto.getMediaDisplayURL = function (displayURL) { return Promise.resolve(displayURL); };
  proto.persistMedia = function () {
    return Promise.reject(new Error('Media uploads are not supported by this gateway.'));
  };
  proto.deleteFiles = function () {
    return Promise.reject(new Error('Deleting files is not supported by this gateway.'));
  };
  proto.deleteFile = proto.deleteFiles;

  /* ---- register (wait for the Decap bundle to define window.CMS) ---- */
  (function register() {
    if (!window.CMS || typeof window.CMS.registerBackend !== 'function') {
      return window.setTimeout(register, 50);
    }
    window.CMS.registerBackend(BACKEND_NAME, BorderlessGatewayBackend);
  })();
})();
