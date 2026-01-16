def build_user_profile_text(
    skills: list[str],
    keywords: str | None = None,
    about: str | None = None,
) -> str:
    """
    Build a user profile text for similarity models.
    """
    parts = list(skills)
    if keywords:
        parts.append(keywords)
    if about:
        parts.append(about)
    return " ".join(parts)


def build_vacancy_text(
    title: str,
    description: str,
    requirements: str | None = None,
    responsibilities: str | None = None,
    company: str | None = None,
) -> str:
    """
    Vacancy text for TF-IDF/embeddings.
    """
    parts = [title, description or ""]
    if requirements:
        parts.append(requirements)
    if responsibilities:
        parts.append(responsibilities)
    if company:
        parts.append(company)
    return " ".join(parts)
