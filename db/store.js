const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function genId() {
  return crypto.randomBytes(12).toString("hex");
}

class Collection {
  constructor(name) {
    this.name = name;
    this.file = path.join(DATA_DIR, `${name}.json`);
    this.docs = this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _persist() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.docs, null, 2));
    fs.renameSync(tmp, this.file);
  }

  replaceAll(docs) {
    this.docs = docs.map((d) => ({ id: d.id || genId(), ...d }));
    this._persist();
    return this.docs;
  }

  all() {
    return this.docs.slice();
  }

  count() {
    return this.docs.length;
  }

  findById(id) {
    return this.docs.find((d) => d.id === id) || null;
  }

  findOne(predicate) {
    return this.docs.find(predicate) || null;
  }

  find(predicate) {
    return predicate ? this.docs.filter(predicate) : this.all();
  }

  insert(doc) {
    const record = { id: doc.id || genId(), ...doc };
    this.docs.push(record);
    this._persist();
    return record;
  }

  update(id, patch) {
    const idx = this.docs.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    this.docs[idx] = { ...this.docs[idx], ...patch, id };
    this._persist();
    return this.docs[idx];
  }

  remove(id) {
    const idx = this.docs.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    this.docs.splice(idx, 1);
    this._persist();
    return true;
  }
}

const _cache = {};

function collection(name) {
  if (!_cache[name]) _cache[name] = new Collection(name);
  return _cache[name];
}

module.exports = { collection, genId, DATA_DIR };
