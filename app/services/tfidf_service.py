from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class TFIDFService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words=None,   # важно для RU/EN
            max_features=5000
        )

    def compute_similarity(
        self,
        user_text: str,
        vacancies_texts: list[str]
    ) -> list[float]:
        """
        Возвращает cosine similarity пользователя
        с каждой вакансией
        """
        corpus = [user_text] + vacancies_texts

        tfidf_matrix = self.vectorizer.fit_transform(corpus)

        similarities = cosine_similarity(
            tfidf_matrix[0:1],
            tfidf_matrix[1:]
        )[0]

        return similarities.tolist()
