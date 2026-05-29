from .en import STRINGS_EN
from .zh import STRINGS_ZH

STRINGS = {
    "en": STRINGS_EN,
    "zh": STRINGS_ZH,
}


def get_ui_string(key: str, locale: str) -> str:
    lang = "zh" if locale == "zh" else "en"
    return STRINGS.get(lang, STRINGS["en"]).get(key, STRINGS["en"][key])


__all__ = [
    "STRINGS",
    "STRINGS_EN",
    "STRINGS_ZH",
    "get_ui_string",
]
