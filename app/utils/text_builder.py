def build_user_profile_text(skills: list[str]) -> str:
    """
    Преобразует навыки пользователя в текстовый профиль
    """
    return " ".join(skills)


def build_vacancy_text(title: str, description: str) -> str:
    """
    Текст вакансии для TF-IDF
    """
    return f"{title} {description}"
