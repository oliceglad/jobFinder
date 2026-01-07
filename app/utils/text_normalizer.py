import re

def normalize_skill_name(name: str) -> str:
    name = name.lower()
    name = re.sub(r"[^a-zа-я0-9+#]", "", name)
    return name
