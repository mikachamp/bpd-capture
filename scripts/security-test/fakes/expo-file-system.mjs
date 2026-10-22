// A stand-in for expo-file-system's Directory/File/Paths API, backed by Node's
// real filesystem under a temporary folder, so src/services/storage.ts can be
// tested on a PC. Joins names onto the parent URI without normalising ".." —
// the code under test has to defend itself, the same as on a phone.
import fs from 'node:fs';
import path from 'node:path';

const root = () => process.env.BPD_FAKE_DOCUMENTS;
const toFsPath = (uri) => decodeURIComponent(uri.replace(/^file:\/\//, '').replace(/\/+$/, ''));
const joinUri = (parts) =>
  parts
    .map((p) => (typeof p === 'string' ? p : p.uri))
    .reduce((acc, part) => (acc ? acc.replace(/\/+$/, '') + '/' + part.replace(/^\/+/, '') : part), '');

export class Directory {
  constructor(...parts) {
    this.uri = joinUri(parts).replace(/\/*$/, '/');
  }
  get exists() {
    return fs.existsSync(toFsPath(this.uri)) && fs.statSync(toFsPath(this.uri)).isDirectory();
  }
  get name() {
    return path.basename(toFsPath(this.uri));
  }
  create() {
    fs.mkdirSync(toFsPath(this.uri), { recursive: true });
  }
  delete() {
    fs.rmSync(toFsPath(this.uri), { recursive: true, force: true });
  }
  async move(destination) {
    fs.renameSync(toFsPath(this.uri), toFsPath(destination.uri));
    this.uri = destination.uri;
  }
}

export class File {
  constructor(...parts) {
    this.uri = joinUri(parts);
  }
  get exists() {
    return fs.existsSync(toFsPath(this.uri));
  }
  get name() {
    return path.basename(toFsPath(this.uri));
  }
  get extension() {
    return path.extname(toFsPath(this.uri));
  }
  get parentDirectory() {
    return new Directory(this.uri.replace(/\/[^/]*$/, ''));
  }
  delete() {
    fs.rmSync(toFsPath(this.uri), { force: true });
  }
  async move(destination) {
    fs.mkdirSync(path.dirname(toFsPath(destination.uri)), { recursive: true });
    fs.renameSync(toFsPath(this.uri), toFsPath(destination.uri));
    this.uri = destination.uri;
  }
  async copy(destination) {
    fs.copyFileSync(toFsPath(this.uri), toFsPath(destination.uri));
  }
  write(text) {
    fs.mkdirSync(path.dirname(toFsPath(this.uri)), { recursive: true });
    fs.writeFileSync(toFsPath(this.uri), text);
  }
}

export const Paths = {
  get document() {
    return new Directory('file://' + root().split(path.sep).join('/'));
  },
  get cache() {
    return new Directory('file://' + path.join(root(), 'cache').split(path.sep).join('/'));
  },
};
