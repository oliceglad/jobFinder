KNOWN_SKILLS = {
    "python", "fastapi", "django", "flask",
    "postgres", "sql", "docker", "git",
    "linux", "redis"
}

def extract_skills(text: str) -> list[str]:
    text = text.lower()
    found = []

    for skill in KNOWN_SKILLS:
        if skill in text:
            found.append(skill)

    return found
