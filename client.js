// Substance.Client 0.1.0
// (c) 2013 Michael Aufreiter
// Substance.Client is freely distributable under the MIT license.
// For all details and documentation:
// http://github.com/substance/client

(function() {
  if (!window.Substance) window.Substance = {};

  function _generic_request(host, method, path, data, headers, cb, raw) {
    function getURL() {
      var url = host + path;
      return url + ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime();
    }

    var xhr = new XMLHttpRequest();
    if (!raw) {xhr.dataType = "json";}

    xhr.open(method, getURL());
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status >= 200 && this.status < 300 || this.status === 304) {
          cb(null, raw ? this.responseText : this.responseText ? JSON.parse(this.responseText) : true);
        } else {
          cb({request: this, error: this.status});
        }
      }
    };

    // xhr.setRequestHeader('Accept','application/vnd.github.raw');
    // xhr.setRequestHeader('Content-Type','application/json');

    //HACK: because DELETE doesnt accept application/json content type
    if (method.toUpperCase() !== 'DELETE') {
      headers['Content-Type'] = "application/json";
    }

    _.each(headers, function(value, key) {
      xhr.setRequestHeader(key, value);
    });

    data ? xhr.send(JSON.stringify(data)) : xhr.send();
  }


  // Substance.Client Interface
  // -------

  Substance.Client = function(options) {
    var that = this;

    if (options.token) this.token = options.token;

    // Helpers
    // =======

    function headers() {
      var headers = {};
      // Adds authorization token if available
      if (that.token) {
        headers["Authorization"] = "token " + that.token;
      }
      return headers;
    }

    function _request(method, path, data, headers, cb, raw) {
      return _generic_request(options.hub_api, method, path, data, headers, cb, raw);
    }

    this.request = function(method, path, data, cb, raw) {
      return _request(method, path, data, headers(), cb, raw);
    };


    // Users API
    // ==========================

    // Authenticate with username and password
    // -------

    this.authenticate = function(username, password, cb) {
      var data = {
        "client_id": options.client_id,
        "client_secret": options.client_secret
      };

      var headers = {
        'Authorization': 'Basic ' + Base64.encode(username + ':' + password)
      };

      _request("POST", "/authorizations", data, headers, function(err, data) {
        if (err) return cb(err);
        that.token = data.token;
        cb(null, data);
      });
    };


    // Create new publication on the server
    // -------

    this.createUser = function(user, cb) {
      var data = {
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "password": user.password,
        "client_id": options.client_id,
        "client_secret": options.client_secret
      };

      this.request("POST", "/register", data, function(err, res) {
        cb(err, res);
      });
    };


    // Publications API
    // ==========================

    // Create new publication on the server
    // -------

    this.createPublication = function(document, network, cb) {
      this.request("POST", "/documents/"+document+"/publications", {network: network}, function(err, res) {
        cb(err, res);
      });
    };

    // Delete publication from the server
    // -------

    this.deletePublication = function(document, network, cb) {
      this.request("DELETE", "/documents/"+document+"/publications/"+network, null, function(err, res) {
        cb(err, res);
      });
    };


    // Load Publications for a document
    // -------

    this.loadPublications = function(document, cb) {
      this.request("GET", "/documents/"+document+"/publications", null, function(err, publications) {
        cb(err, publications);
      });
    };


    // Networks API
    // ==========================

    // Load all available networks
    // -------

    this.loadNetworks = function(cb) {
      this.request("GET", "/networks", null, function(err, networks) {
        cb(err, networks);
      });
    };


    // Versions API
    // ==========================


    // Create new version for a document
    // -------

    this.createVersion = function(document, data, cb) {
      this.request("POST", "/documents/"+document+"/versions", {data: JSON.stringify(data)}, function(err, res) {
        cb(err, res);
      });
    };

    // Delete all versions for a document
    // -------

    this.unpublish = function(document, cb) {
      this.request("DELETE", "/documents/"+document+"/versions", null, function(err) {
        cb(err);
      });
    };


    // Collaborators API
    // ==========================


    // Load collaborators for a document
    // -------

    this.loadCollaborators = function(document, cb) {
      this.request("GET", "/documents/"+document+"/collaborators", null, function(err, res) {
        cb(err, res);
      });
    };

    // Create collaborator for document
    // -------

    this.createCollaborator = function(document, collaborator, cb) {
      this.request("POST", "/documents/"+document+"/collaborators", {collaborator: collaborator}, function(err, res) {
        cb(err, res);
      });
    };

    // Delete collaborator for a document
    // -------

    this.deleteCollaborator = function(document, collaborator, cb) {
      this.request("DELETE", "/documents/"+document+"/collaborators/"+collaborator, null, function(err, res) {
        cb(err, res);
      });
    };



    // Document API
    // ==========================


    // Create a new document
    // ----------

    this.createDocument = function(id, cb) {
      this.hub.request('POST', '/documents', {id: id}, function(err) {
        cb(err);
      });
    };

    // Get document by id
    // ----------

    this.getDocument = function(id, cb) {
      this.hub.request('GET', '/documents/'+id, null, function(err, doc) {
        cb(err, doc);
      });
    };

    // List all allowed documents complete with metadata
    // -------

    // TODO: Currently the hub returns a hash for documents, should be a list!
    this.listDocuments = function (cb) {
      this.hub.request('GET', '/documents', null, function(err, documents) {
        cb(err, documents);
      });
    };

    // Permanently deletes a document
    // -------

    this.deleteDocument = function (id, cb) {
      this.hub.request("DELETE", '/documents/' + id, null, function(err) {
        cb(err);
      });
    };

    // Retrieves a range of the document's commits
    // -------

    this.documentCommits = function(id, head, stop, cb) {
      // Head defaults to tail on the server, we should make this explicit
      // Provide head to server!
      this.hub.request("GET", '/documents/'+id+'/commits', {since: stop, head: head}, function(err, commits) {
        cb(err, commits);
      });
    };

    // Stores a sequence of commits for a given document id.
    // -------

    // TODO: update original API so they also take meta and refs
    this.updateDocument = function(id, newCommits, meta, refs, cb) {
      var data = {
        commits: newCommits, // may be empty
        meta: meta,
        refs: refs // make sure refs are updated on the server (for now master, tail is updated implicitly)
      };

      this.hub.request("PUT", '/documents/'+id, data, function (err) {
        return cb(err);
      });
    };

  };
}).call(this);
