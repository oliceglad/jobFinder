from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


class EmbeddingService:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            cls._model = SentenceTransformer(
                "paraphrase-multilingual-MiniLM-L12-v2"
            )
        return cls._model

    @classmethod
    def compute_similarity(
        cls,
        user_text: str,
        vacancies_texts: list[str]
    ) -> list[float]:
        try:
            model = cls.get_model()
        except Exception:
            return [0.0 for _ in vacancies_texts]

        embeddings = model.encode(
            [user_text] + vacancies_texts,
            normalize_embeddings=True
        )

        user_embedding = embeddings[0].reshape(1, -1)
        vacancy_embeddings = embeddings[1:]

        similarities = cosine_similarity(
            user_embedding,
            vacancy_embeddings
        )[0]

        return similarities.tolist()
