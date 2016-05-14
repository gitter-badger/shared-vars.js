const EventEmitter = require('events');
const util = require('util');
const Signature = require('./Signature');

function SharedVar(shared, publicKey, privateKey = null) {
  EventEmitter.call(this);

  this._shared = shared;
  this.value = undefined;
  this.signature = null;

  this.publicKey = publicKey;
  this.privateKey = privateKey;

  this._shared.onPublish(publicKey, (signature) => {
    if (this.signature && this.signature.betterThen(signature)) return;

    this.emit('download', signature);
    this._shared.download(signature, (err, value) => {
      if (err) return;

      this.value = value;
      this.signature = signature;

      this.emit('update');
    });
  });
}
util.inherits(SharedVar, EventEmitter);
const proto = SharedVar.prototype;


proto.sync = (callback) => {
  this._shared.lookup(this.publicKey, this.signature);
  if (callback) this.once('update', callback);

  return this;
};

proto.set = (value) => {
  if (!this.privateKey) throw new Error('This reference is readonly');

  this.value = value;

  const valueBuf = this._shared.encode(value);
  const valueHash = Signature.createHash.update(valueBuf).digest();
  this.signature = Signature.sign(this.privateKey, valueHash);

  this._shared.publish(this.signature, this);
  return this;
};