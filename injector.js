var ctrlJsServer = function () {
  this.init = function(){
    // The Connection Objects Keyed by the Peer IDs
    this.connections = {};
    // This Instance's PeerID
    this.peerId = null;

    this.defaultKeyMappings = {
      Up:    {key: "w",     code: "KeyW",      keyCode: 87},
      Left:  {key: "a",     code: "KeyA",      keyCode: 65},
      Down:  {key: "s",     code: "KeyS",      keyCode: 83},
      Right: {key: "d",     code: "KeyD",      keyCode: 68},
      A:     {key: " ",     code: "Space",     keyCode: 32},
      B:     {key: "Shift", code: "ShiftLeft", keyCode: 16}
    }

    // Initialize ourselves as a Peer using an RTCConfiguration object
    // Please do not use these turn servers; they are not made for high bandwidth!
    this.peer = new Peer({
      config: {
        iceServers: [{
          urls: [ "stun:ws-turn2.xirsys.com", "stun:stun.l.google.com:19302" ]
        }, {
          username: "RZyygb9oUYQFuiNJ62O1gr61l_qbtLeiyH6driGchkplknMYoj2q2loF_33bLqk9AAAAAF0c60R6YWxv",
          credential: "44ba5ddc-9dbb-11e9-997a-a695319b0c25",
          urls: [
            "turn:ws-turn2.xirsys.com:80?transport=udp",
            "turn:ws-turn2.xirsys.com:3478?transport=udp",
            "turn:ws-turn2.xirsys.com:80?transport=tcp",
            "turn:ws-turn2.xirsys.com:3478?transport=tcp",
            "turns:ws-turn2.xirsys.com:443?transport=tcp",
            "turns:ws-turn2.xirsys.com:5349?transport=tcp"
          ]
        }]
      }
    });

    // Upon connection, begin initializing Network-related callbacks
    this.peer.on('open', (id) => {
      this.peerId = id;
      console.log('My peer ID is: ' + this.peerId);
      this.createStatusView();

      this.peer.on('connection', (connection) => {
        connection.on('open', () => {
          this.connections[connection.peer] = connection;
          console.log('I have seen that: ' + connection.peer + " has successfully connected!");
          connection.buttonStates = {};
          this.addPlayerDiv(connection);
          this.updatePlayerNumbers();
        });
        connection.on('data', (data) => {
          if("pingTime" in data){ connection.send(data); }
          if("playerName" in data){
             connection.playerName = data.playerName; 
             this.updatePlayerDiv(connection);
          }
          if("btn" in data) {
             connection.buttonStates[data.btn] = data.state;
             this.spoofKeyboardEvent(connection, data.btn, data.state);
          }

          // Append this packet to the debug history if it exists...
          let history = document.getElementById("eventHistory");
          if(history){ history.innerText = JSON.stringify(data) + "\n" + history.innerText; }
        });
        connection.on('close', () => {
          console.log(connection.peer + " has left...");
          this.statusView.players.removeChild(connection.playerDiv);
          delete this.connections[connection.peer];
          this.updatePlayerNumbers();
        });
        connection.on('error', (err) => { console.error(err); });
      });
    });
    this.peer.on('error', (err) => { console.error(err); });

    // Create the Miniature Viewport in the corner of the page
    this.createStatusView = function(){
      // Create the StatusView div using spiffy APIs
      this.statusView = document.createElement("div", { id: 'statusView' });
      this.statusView.style = "position:fixed; bottom:0px; right:0px; border: 1px solid black; background:white;";
      this.statusView.innerText = "Players";

      // Add the Players Container
      this.statusView.players = document.createElement("div", { id: 'statusViewPlayers' });
      this.statusView.players.style = "border: 1px solid black;";
      this.statusView.insertAdjacentElement("beforeend", this.statusView.players);

      // Add the QR Code (with padding so it will scan!)
      this.statusView.qrContainer = document.createElement("div", { id: 'qrcodeContainer' });
      this.statusView.qrContainer.style = "padding:10px";
      this.statusView.insertAdjacentElement("beforeend", this.statusView.qrContainer);
      this.statusView.qrCode = new QRCode(this.statusView.qrContainer, "https://zalo.github.io/ctrl.js?id=" + this.peerId);

      // Add the status view to the page!
      document.body.insertAdjacentElement("beforeend", this.statusView);
    }

    // Manage the player statuses
    this.addPlayerDiv = function(connection) {
      connection.playerDiv = document.createElement("div", { id: connection.peer+"'s Player Status" });
      connection.playerDiv.style = "background-image: linear-gradient(white, gray); border: 1px solid black;";
      connection.playerDiv.innerHTML = "New Player";
      this.statusView.players.insertAdjacentElement("beforeend", connection.playerDiv);
    }
    this.updatePlayerDiv = function(connection) {
      if(typeof(connection.playerDiv) !== 'undefined'){
        let bulletColor = '#00FF00';
        // This is expensive and can lead to long recalculations!
        /*connection.playerDiv.style = "background-image: linear-gradient(white, gray); border: 1px solid black;";
        Object.getOwnPropertyNames(connection.buttonStates).forEach((btn) => {
           if(connection.buttonStates[btn]) {
              connection.playerDiv.style = "background-image: linear-gradient(gray, white); border: 1px solid black;";
            } });*/
        connection.playerDiv.innerHTML = '<font style="color:'+bulletColor+';font-weight:bold;font-size:1.5em"> + </font>' + connection.playerNum + ' - ' + connection.playerName;
      }
    }
    this.spoofKeyboardEvent = function(connection, button, state) {
      let mapping = this.defaultKeyMappings[button];
      let keyOptions = { key: mapping.key, code: mapping.code, keyCode: mapping.keyCode, bubbles: true, cancelable: false };

      if(state){
        window.dispatchEvent(new KeyboardEvent("keydown",  keyOptions));
        window.dispatchEvent(new KeyboardEvent("keypress", keyOptions));
        document.dispatchEvent(new KeyboardEvent("keydown",  keyOptions));
        document.dispatchEvent(new KeyboardEvent("keypress", keyOptions));
      }else{
        window.dispatchEvent(new KeyboardEvent("keyup", keyOptions));
        document.dispatchEvent(new KeyboardEvent("keyup", keyOptions));
      }
    }

    // The number of players have changed, so send updates to all of the connected clients.
    this.updatePlayerNumbers = function() {
      let i = 1; 
      Object.getOwnPropertyNames(this.connections).forEach((peerID) => {
        this.connections[peerID].playerNum = i;
        this.connections[peerID].send({playerNum: i});
        this.updatePlayerDiv(this.connections[peerID]);
        i+=1; 
      });
    }
  }

  // Don't initialize the bookmarklet again if there's already a StatusView
  let existingStatusView = document.getElementById("statusView");
  if(typeof(existingStatusView) === 'undefined' || existingStatusView === null){
    this.init();
  } else { delete this; }
}

// Initialize the server view
var ctrlJsInstance = new ctrlJsServer();