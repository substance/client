// Substance.Client 0.1.0
// (c) 2013 Michael Aufreiter
// Substance.Client is freely distributable under the MIT license.
// For all details and documentation:
// http://github.com/substance/client
(function() {

if (!window.Substance) window.Substance = {};

// Substance.Client Interface
// -------

var Client = function(options) {

  this.options = options;
  this.store = this.__store__();

};

Client.__prototype__ = function() {

  var private = new Client.__private__();

  // Helpers
  // =======

  this.request = function(method, path, data, cb, raw) {
    return private.request.call(this, method, path, data, private.headers.call(this), cb, raw);
  };

  // Users API
  // ==========================

  // Authenticate with username and password
  // -------

  this.authenticate = function(username, password, cb) {
    var self = this;

    var data = {
      "client_id": this.options.client_id,
      "client_secret": this.options.client_secret
    };

    var headers = {
      'Authorization': 'Basic ' + Base64.encode(username + ':' + password)
    };

    private.request.call(this, "POST", "/authorizations", data, headers, function(err, data) {
      if (err) return cb(err);
      self.token = data.token;
      cb(null, data);
    });
  };

  // Create new user on the server
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
    this.request("POST", "/publications", {document: document, network: network}, function(err, res) {
      cb(err, res);
    });
  };

  // Delete publication from the server
  // -------

  this.deletePublication = function(id, cb) {
    this.request("DELETE", "/publications/"+id, null, function(err, res) {
      cb(err, res);
    });
  };


  // List Publications for a document
  // -------

  this.listPublications = function(document, cb) {
    this.request("GET", "/publications", {document: document}, function(err, publications) {
      cb(err, publications);
    });
  };


  // Networks API
  // ==========================

  // Get all available networks
  // -------

  this.listNetworks = function(cb) {
    this.request("GET", "/networks", null, function(err, networks) {
      cb(err, networks);
    });
  };


  // Versions API
  // ==========================


  // Create new version for a document
  // -------

  this.createVersion = function(document, data, cb) {
    this.request("POST", "/versions", {document: document, data: JSON.stringify(data)}, function(err, res) {
      cb(err, res);
    });
  };

  // Delete all versions for a document
  // -------

  this.unpublish = function(document, cb) {
    this.request("DELETE", "/versions", {document: document}, function(err) {
      cb(err);
    });
  };

  // Collaborators API
  // ==========================

  // List collaborators for a document
  // -------

  this.listCollaborators = function(document, cb) {
    this.request("GET", "/collaborators", {document: document}, function(err, res) {
      cb(err, res);
    });
  };

  // Create collaborator for document
  // -------

  this.createCollaborator = function(document, collaborator, cb) {
    this.request("POST", "/collaborators", {collaborator: collaborator, document: document}, function(err, res) {
      cb(err, res);
    });
  };

  // Delete collaborator for a document
  // -------

  this.deleteCollaborator = function(collaborator, cb) {
    this.request("DELETE", "/collaborators/"+collaborator, null, function(err, res) {
      cb(err, res);
    });
  };

  // Seed
  // ==========================

  this.seed = function(seed, cb) {
    if (_.isString(seed)) {
      var seedName = seed;
      console.log("Seeding hub with", seedName, "...");
      this.request("GET", "/seed/"+seedName, null, function(err, res) {
        if(err) console.log("...failed", err);
        else console.log("...done")
        cb(err, res);
      });
    } else {
      console.log("Seeding hub with object", seed, "...");
      this.request("POST", "/seed", seed, function(err, res) {
        cb(err, res);
      });
    }
  };

  this.__store__ = function() { return new Client.Store(this); };

};

Client.__private__ = function() {

  var private = this;

  private.headers = function() {
    var headers = {};
    // Adds authorization token if available
    if (this.options.token) {
      headers["Authorization"] = "token " + this.options.token;
    }
    return headers;
  }

  private.request = function(method, path, data, headers, cb, raw) {
    return private.generic_request(this.options.hub_api, method, path, data, headers, cb, raw);
  }

  private.generic_request = function(host, method, path, data, headers, cb, raw) {

    // TODO: Move to util?
    function toQueryString(obj) {
      var str = [];
      for(var p in obj)
         str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      return str.join("&");
    }

    function getURL() {
      var url = host + path;
      if (method.toUpperCase() === "GET" && data && Object.keys(data).length > 0) {
        url += "?"+toQueryString(data);
      }
      return url + ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime();
    }

    var xhr = new XMLHttpRequest();
    if (!raw) {xhr.dataType = "json";}

    xhr.open(method, getURL());
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        // TODO: this needs some explanation
        if (this.status >= 200 && this.status < 300 || this.status === 304) {
          cb(null, raw ? this.responseText : this.responseText ? JSON.parse(this.responseText) : true);
        } else {
          // try to interpret the response as json
          try {
            var err = JSON.parse(this.responseText);
            if (err.stack) console.log(err.stack);
            cb(err)
          } catch (err) {
            // if not possible fall back to string based errors
            cb(this.responseText);
          }
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


}

// Store API
// =========

Client.Store = function(client) {

  this.create = function(id, options, cb) {
    client.request('POST', '/documents', _.extend(options, {id: id}), function(err, doc) {
      cb(err, doc);
    });
  };

  this.get = function(id, cb) {
    client.request('GET', '/documents/'+id, null, function(err, doc) {
      cb(err, doc);
    });
  };

  this.getInfo = function(id, cb) {
    client.request('GET', '/documents/'+id+'/info', null, function(err, info) {
      cb(err, info);
    });
  };

  // TODO: Currently the hub returns a hash for documents, should be a list!
  this.list = function (cb) {
    client.request('GET', '/documents', null, cb);
  };

  this.delete = function (id, cb) {
    client.request("DELETE", '/documents/' + id, null, function(err) {
      cb(err);
    });
  };

  // Retrieves a range of the document's commits
  // -------
  //
  this.commits = function(id, options, cb) {
    // Head defaults to tail on the server, we should make this explicit
    // Provide head to server!
    client.request("GET", '/documents/'+id+'/commits', options, function(err, commits) {
      cb(err, commits);
    });
  };

  this.update = function(id, options, cb) {
    client.request("PUT", '/documents/'+id, options, function (err) {
      return cb(err);
    });
  };

  this.blobs = new Client.Store.Blobs(client);

};

Client.Store.Blobs = function(client) {

  // Create Blob on the server
  // -------

  this.create = function(docId, blobId, blobData, cb) {
    client.request("POST", '/documents/'+docId+'/blobs/'+blobId, {data: blobData}, function (err) {
      return cb(err);
    });
  };

  // Get Blob from server
  // -------

  this.get = function(docId, blobId, cb) {
    client.request("GET", '/documents/'+docId+'/blobs/'+blobId, null, cb);
  };

  this.delete = function(docId, blobId, cb) {
    client.request("DELETE", '/documents/'+docId+'/blobs/'+blobId, null, cb);
  };

  this.list = function(docId, cb) {
    client.request("GET", '/documents/'+docId+'/blobs', null, cb);
  };

};

Client.prototype = new Client.__prototype__();

window.Substance.Client = Client;

}).call(this);
