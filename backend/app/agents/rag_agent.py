import os
from typing import List, Dict, Any

# Ensure required packages are installed: chromadb, sentence_transformers
# This agent provides simple Retrieval-Augmented Generation (RAG) capabilities.

class RAGAgent:
    """Simple RAG agent using ChromaDB and SentenceTransformers.

    It loads a Chroma collection from a persistent directory (default ``./chroma_db``)
    and uses a SentenceTransformer model to embed queries. The ``query`` method
    returns the top-k most similar documents as a list of dictionaries containing
    the document ``id``, ``content`` and ``metadata``.
    """

    def __init__(self, collection_name: str = "knowledge_base", persist_dir: str = "./chroma_db", model_name: str = "all-MiniLM-L6-v2", top_k: int = 5):
        # Lazy imports to avoid import errors if packages are missing at runtime.
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
        except ImportError as e:
            raise ImportError(
                "RAGAgent requires 'chromadb' and 'sentence_transformers' packages. "
                "Install them via pip before using this class."
            ) from e

        self.top_k = top_k
        self.persist_dir = os.path.abspath(persist_dir)
        os.makedirs(self.persist_dir, exist_ok=True)

        # Initialize Chroma client (persistent) and collection.
        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.client.get_or_create_collection(name=collection_name)

        # Load embedding model.
        self.embedder = SentenceTransformer(model_name)

    def add_documents(self, docs: List[Dict[str, Any]]) -> None:
        """Add a list of documents to the collection.

        Each document dict must contain ``id`` (str), ``content`` (str) and optional ``metadata`` (dict).
        """
        ids = [d["id"] for d in docs]
        texts = [d["content"] for d in docs]
        metadatas = [d.get("metadata", {}) for d in docs]
        embeddings = self.embedder.encode(texts, show_progress_bar=False).tolist()
        self.collection.add(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings)

    def query(self, query_text: str) -> List[Dict[str, Any]]:
        """Return the top‑k most similar documents for ``query_text``.

        The result is a list of dicts with keys ``id``, ``content`` and ``metadata``.
        """
        query_emb = self.embedder.encode([query_text], show_progress_bar=False).tolist()[0]
        results = self.collection.query(
            query_embeddings=[query_emb],
            n_results=self.top_k,
            include=['documents', 'metadatas', 'distances']
        )
        # ``results`` structure: {'ids': [[...]], 'documents': [[...]], 'metadatas': [[...]], 'distances': [[...]]}
        output = []
        for i in range(len(results["ids"][0])):
            output.append({
                "id": results["ids"][0][i],
                "content": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i]
            })
        return output
