"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chroma = void 0;
const uuid = __importStar(require("uuid"));
const base_js_1 = require("./base.cjs");
const document_js_1 = require("../document.cjs");
class Chroma extends base_js_1.VectorStore {
    constructor(embeddings, args) {
        super(embeddings, args);
        Object.defineProperty(this, "index", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "collectionName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "numDimensions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "filter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.numDimensions = args.numDimensions;
        this.embeddings = embeddings;
        this.collectionName = ensureCollectionName(args.collectionName);
        if ("index" in args) {
            this.index = args.index;
        }
        else if ("url" in args) {
            this.url = args.url || "http://localhost:8000";
        }
        this.filter = args.filter;
    }
    async addDocuments(documents) {
        const texts = documents.map(({ pageContent }) => pageContent);
        await this.addVectors(await this.embeddings.embedDocuments(texts), documents);
    }
    async ensureCollection() {
        if (!this.collection) {
            if (!this.index) {
                const { ChromaClient } = await Chroma.imports();
                this.index = new ChromaClient({ path: this.url });
            }
            try {
                this.collection = await this.index.getOrCreateCollection({
                    name: this.collectionName,
                });
            }
            catch (err) {
                throw new Error(`Chroma getOrCreateCollection error: ${err}`);
            }
        }
        return this.collection;
    }
    async addVectors(vectors, documents) {
        if (vectors.length === 0) {
            return;
        }
        if (this.numDimensions === undefined) {
            this.numDimensions = vectors[0].length;
        }
        if (vectors.length !== documents.length) {
            throw new Error(`Vectors and metadatas must have the same length`);
        }
        if (vectors[0].length !== this.numDimensions) {
            throw new Error(`Vectors must have the same length as the number of dimensions (${this.numDimensions})`);
        }
        const collection = await this.ensureCollection();
        const docstoreSize = await collection.count();
        await collection.add({
            ids: Array.from({ length: vectors.length }, (_, i) => (docstoreSize + i).toString()),
            embeddings: vectors,
            metadatas: documents.map(({ metadata }) => metadata),
            documents: documents.map(({ pageContent }) => pageContent),
        });
    }
    async similaritySearchVectorWithScore(query, k, filter) {
        if (filter && this.filter) {
            throw new Error("cannot provide both `filter` and `this.filter`");
        }
        const _filter = filter ?? this.filter;
        const collection = await this.ensureCollection();
        // similaritySearchVectorWithScore supports one query vector at a time
        // chroma supports multiple query vectors at a time
        const result = await collection.query({
            query_embeddings: query,
            n_results: k,
            where: { ..._filter },
        });
        const { ids, distances, documents, metadatas } = result;
        if (!ids || !distances || !documents || !metadatas) {
            return [];
        }
        // get the result data from the first and only query vector
        const [firstIds] = ids;
        const [firstDistances] = distances;
        const [firstDocuments] = documents;
        const [firstMetadatas] = metadatas;
        const results = [];
        for (let i = 0; i < firstIds.length; i += 1) {
            results.push([
                new document_js_1.Document({
                    pageContent: firstDocuments?.[i] ?? "",
                    metadata: firstMetadatas?.[i] ?? {},
                }),
                firstDistances[i],
            ]);
        }
        return results;
    }
    static async fromTexts(texts, metadatas, embeddings, dbConfig) {
        const docs = [];
        for (let i = 0; i < texts.length; i += 1) {
            const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
            const newDoc = new document_js_1.Document({
                pageContent: texts[i],
                metadata,
            });
            docs.push(newDoc);
        }
        return Chroma.fromDocuments(docs, embeddings, dbConfig);
    }
    static async fromDocuments(docs, embeddings, dbConfig) {
        const instance = new this(embeddings, dbConfig);
        await instance.addDocuments(docs);
        return instance;
    }
    static async fromExistingCollection(embeddings, dbConfig) {
        const instance = new this(embeddings, dbConfig);
        await instance.ensureCollection();
        return instance;
    }
    static async imports() {
        try {
            const { ChromaClient } = await import("chromadb");
            return { ChromaClient };
        }
        catch (e) {
            throw new Error("Please install chromadb as a dependency with, e.g. `npm install -S chromadb`");
        }
    }
}
exports.Chroma = Chroma;
function ensureCollectionName(collectionName) {
    if (!collectionName) {
        return `langchain-${uuid.v4()}`;
    }
    return collectionName;
}
