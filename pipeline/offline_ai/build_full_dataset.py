#!/usr/bin/env python3
"""Build /data/sgyy_full dataset from 三国演义 source text."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "sgyy_full"
RAW_TEXT_CANDIDATES = [
    ROOT / "原著.txt",
    ROOT / "data" / "raw" / "sgyy_120.txt",
]

SOURCE_VERSION = "三国演义（原著.txt分段抽取）"

PERIODS = [
    {"id": "p1", "title": "第一卷：乱世狂澜", "chapter_start": 1, "chapter_end": 9, "description": "黄巾起义至董卓覆灭"},
    {"id": "p2", "title": "第二卷：群雄逐鹿", "chapter_start": 10, "chapter_end": 33, "description": "诸侯割据至官渡之后"},
    {"id": "p3", "title": "第三卷：赤壁风云", "chapter_start": 34, "chapter_end": 50, "description": "三顾茅庐至赤壁余波"},
    {"id": "p4", "title": "第四卷：三分天下", "chapter_start": 51, "chapter_end": 85, "description": "入川建国至白帝托孤"},
    {"id": "p5", "title": "第五卷：星落五丈原", "chapter_start": 86, "chapter_end": 120, "description": "北伐余晖至三分归晋"},
]

CHARACTER_CATALOG = [
    ("liubei", "刘备", "蜀", "昭烈帝", "弘毅宽厚，知人待士。"),
    ("guanyu", "关羽", "蜀", "汉寿亭侯", "威震华夏，义薄云天。"),
    ("zhangfei", "张飞", "蜀", "西乡侯", "勇冠三军，嫉恶如仇。"),
    ("zhugeliang", "诸葛亮", "蜀", "武乡侯", "鞠躬尽瘁，死而后已。"),
    ("zhaoyun", "赵云", "蜀", "顺平侯", "一身是胆，忠勇兼备。"),
    ("machao", "马超", "蜀", "骠骑将军", "西凉锦马超，勇烈过人。"),
    ("huangzhong", "黄忠", "蜀", "后将军", "老当益壮，定军扬威。"),
    ("jiangwei", "姜维", "蜀", "大将军", "继志北伐，心存汉祚。"),
    ("caocao", "曹操", "魏", "魏武帝", "乱世雄主，谋断兼资。"),
    ("caopi", "曹丕", "魏", "魏文帝", "受禅称帝，开曹魏帝业。"),
    ("caorui", "曹叡", "魏", "魏明帝", "守成有术，内政谨严。"),
    ("xiahoudun", "夏侯惇", "魏", "大将军", "曹魏宗室重将。"),
    ("xuchu", "许褚", "魏", "虎侯", "勇猛刚直，护主著称。"),
    ("zhangliao", "张辽", "魏", "征东将军", "逍遥津震江东。"),
    ("simayi", "司马懿", "晋", "晋宣帝", "隐忍深沉，善守善谋。"),
    ("simashi", "司马师", "晋", "晋景帝", "承父权柄，主导中枢。"),
    ("simazhao", "司马昭", "晋", "晋文帝", "篡魏前夜，权归司马。"),
    ("simayan", "司马炎", "晋", "晋武帝", "受禅建晋，终并东吴。"),
    ("sunjian", "孙坚", "吴", "破虏将军", "江东孙氏奠基者。"),
    ("sunce", "孙策", "吴", "讨逆将军", "小霸王定江东。"),
    ("sunquan", "孙权", "吴", "吴大帝", "知人善任，雄踞东南。"),
    ("zhouyu", "周瑜", "吴", "大都督", "赤壁都督，雄姿英发。"),
    ("lumeng", "吕蒙", "吴", "大都督", "白衣渡江，谋取荆州。"),
    ("luxun", "陆逊", "吴", "丞相", "夷陵火攻，名震天下。"),
    ("dongzhuo", "董卓", "群雄", "太师", "祸乱朝纲，暴虐专权。"),
    ("lubu", "吕布", "群雄", "温侯", "骁勇绝伦，反复无常。"),
    ("yuanshao", "袁绍", "群雄", "大将军", "四世三公，盛极而衰。"),
    ("yuanshu", "袁术", "群雄", "后将军", "僭号称帝，速起速亡。"),
    ("liubiao", "刘表", "群雄", "荆州牧", "据荆州以观天下。"),
    ("liuzhang", "刘璋", "群雄", "益州牧", "宽柔守成，失于决断。"),
    ("diaochan", "貂蝉", "其他", "绝世舞姬", "连环计关键人物。"),
    ("han_xiandi", "汉献帝", "汉室", "天子", "名义皇权在乱世飘零。"),
]

NAME_KEYWORDS = {
    "刘备": "liubei",
    "玄德": "liubei",
    "关羽": "guanyu",
    "云长": "guanyu",
    "张飞": "zhangfei",
    "翼德": "zhangfei",
    "诸葛亮": "zhugeliang",
    "孔明": "zhugeliang",
    "赵云": "zhaoyun",
    "子龙": "zhaoyun",
    "马超": "machao",
    "黄忠": "huangzhong",
    "姜维": "jiangwei",
    "曹操": "caocao",
    "孟德": "caocao",
    "曹丕": "caopi",
    "曹叡": "caorui",
    "夏侯惇": "xiahoudun",
    "许褚": "xuchu",
    "张辽": "zhangliao",
    "司马懿": "simayi",
    "仲达": "simayi",
    "司马师": "simashi",
    "司马昭": "simazhao",
    "司马炎": "simayan",
    "孙坚": "sunjian",
    "孙策": "sunce",
    "孙权": "sunquan",
    "周瑜": "zhouyu",
    "吕蒙": "lumeng",
    "陆逊": "luxun",
    "董卓": "dongzhuo",
    "吕布": "lubu",
    "袁绍": "yuanshao",
    "袁术": "yuanshu",
    "刘表": "liubiao",
    "刘璋": "liuzhang",
    "貂蝉": "diaochan",
    "献帝": "han_xiandi",
    "汉献帝": "han_xiandi",
}

EVENT_TITLE_HINTS = [
    ("黄巾", "黄巾起义"),
    ("桃园", "桃园结义"),
    ("董卓", "董卓乱政"),
    ("献刀", "孟德献刀"),
    ("三英战吕布", "三英战吕布"),
    ("连环计", "连环计"),
    ("官渡", "官渡之战"),
    ("三顾茅庐", "三顾茅庐"),
    ("长坂坡", "长坂坡奔战"),
    ("草船借箭", "草船借箭"),
    ("赤壁", "赤壁决战"),
    ("华容道", "华容道放曹"),
    ("入川", "西川争夺"),
    ("汉中", "汉中争锋"),
    ("荆州", "荆州风云"),
    ("水淹七军", "水淹七军"),
    ("败走麦城", "败走麦城"),
    ("夷陵", "夷陵之战"),
    ("白帝城", "白帝托孤"),
    ("出师", "出师北伐"),
    ("街亭", "失守街亭"),
    ("空城", "空城计"),
    ("五丈原", "秋风五丈原"),
    ("高平陵", "高平陵政变"),
    ("受禅", "受禅建晋"),
    ("归一统", "三分归一统"),
]
HINT_TITLE_SET = {hint for _, hint in EVENT_TITLE_HINTS}

SCENE_SHIFT_PREFIXES = (
    "却说",
    "且说",
    "次日",
    "是夜",
    "忽",
    "忽然",
    "正说间",
    "正商议间",
    "原来",
    "再说",
    "当下",
)

ACTION_TOKENS = ("战", "杀", "攻", "破", "围", "退", "追", "降", "计", "谋", "诛", "立", "禅")
PROCESS_HINT_TOKENS = ACTION_TOKENS + ("引", "会", "募", "投", "赴", "议", "结义", "出", "入", "守", "奔")
SETTING_TOKENS = ("时", "当时", "是时", "朝廷", "京师", "州", "郡", "帝", "诏", "贼", "兵")
SUMMARY_NOISE_PREFIXES = (
    "话说",
    "却说",
    "且说",
    "原来",
    "再说",
    "次日",
    "是夜",
    "当下",
    "忽",
    "正说间",
    "正商议间",
    "先是",
    "随后",
)
SUMMARY_NOISE_SENTENCE_FRAGMENTS = (
    "滚滚长江东逝水",
    "古今多少事",
    "且听下文分解",
    "未知",
    "毕竟",
    "周末七国分争",
    "及秦灭之后",
    "楚、汉分争",
    "一统天下",
)
RESULT_HINT_TOKENS = (
    "遂",
    "于是",
    "自此",
    "因此",
    "终",
    "乃",
    "败",
    "死",
    "降",
    "归",
    "定",
    "称帝",
    "受禅",
    "结义",
    "会盟",
    "投军",
    "受封",
    "回军",
    "得脱",
)
BIOGRAPHY_NOISE_TOKENS = (
    "之子",
    "人氏",
    "之后",
    "祖",
    "父",
    "幼孤",
    "幼时",
    "年已",
    "身长",
    "字",
    "曾举孝廉",
    "亦尝作吏",
    "早丧",
    "游学",
    "师事",
    "玄孙",
    "中山靖王",
    "汉武时封",
    "喜歌舞",
)
DESCRIPTION_NOISE_TOKENS = (
    "性宽和",
    "寡言语",
    "相貌堂堂",
    "威风凛凛",
    "面如",
    "唇若",
    "丹凤眼",
    "卧蚕眉",
    "燕颔虎须",
)
SUMMARY_REMOVE_PATTERNS = (
    r"且听下文分解",
    r"毕竟[^。！？]{0,30}",
    r"未知[^。！？]{0,30}",
    r"正说间",
    r"正商议间",
)
TITLE_NOISE_PREFIXES = (
    "话说",
    "却说",
    "且说",
    "原来",
    "次日",
    "是夜",
    "当下",
    "忽见",
    "忽报",
    "再说",
    "只见",
    "时",
)
TITLE_WEAK_EXACT = {
    "二更时分",
    "张角一军",
    "于桃园中",
    "一军",
    "一人",
    "一将",
    "当下",
    "于是",
    "时分",
}

CHAPTER_HEADING_RE = re.compile(r"^\s*第([一二三四五六七八九十百〇零两\d]{1,6})回[　 \t]*([^\n]*)", re.MULTILINE)
NAME_ALIASES_BY_LENGTH = sorted(NAME_KEYWORDS.items(), key=lambda item: len(item[0]), reverse=True)
CHAR_NAME_BY_ID = {item[0]: item[1] for item in CHARACTER_CATALOG}


def period_for_chapter(chapter: int) -> str:
    if chapter <= 9:
        return "p1"
    if chapter <= 33:
        return "p2"
    if chapter <= 50:
        return "p3"
    if chapter <= 85:
        return "p4"
    return "p5"


def default_title(chapter: int) -> str:
    return f"第{chapter}回"


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def split_sentences(text: str) -> list[str]:
    parts = [item.strip() for item in re.split(r"(?<=[。！？!?；;])", text) if item.strip()]
    return parts or ([text.strip()] if text.strip() else [])


def chinese_to_int(token: str) -> int:
    token = token.strip()
    if token.isdigit():
        return int(token)

    token = token.replace("两", "二").replace("〇", "零")
    nums = {"零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}

    def parse_tens(value: str) -> int:
        if not value:
            return 0
        if "十" in value:
            left, right = value.split("十", 1)
            tens = nums[left] if left else 1
            ones = nums[right] if right else 0
            return tens * 10 + ones
        return nums[value]

    if "百" in token:
        left, right = token.split("百", 1)
        hundreds = nums[left] if left else 1
        return hundreds * 100 + parse_tens(right)

    return parse_tens(token)


def normalize_title(title: str) -> str:
    clean = re.sub(r"\s+", " ", title).strip()
    return clean or "（回目缺失）"


def read_source_text() -> str:
    for candidate in RAW_TEXT_CANDIDATES:
        if candidate.exists():
            return candidate.read_text(encoding="utf-8", errors="ignore")
    raise FileNotFoundError("No source text found. Expected 原著.txt or data/raw/sgyy_120.txt")


def split_paragraphs(text: str) -> list[str]:
    blocks = re.split(r"\n\s*\n+", text)
    paragraphs: list[str] = []
    for block in blocks:
        cleaned = re.sub(r"\s+", "", block)
        if cleaned:
            paragraphs.append(cleaned)
    return paragraphs


def clean_paragraphs(chapter_number: int, paragraphs: list[str]) -> list[str]:
    cleaned = [item for item in paragraphs if not item.startswith("——调寄")]
    if chapter_number == 1:
        for idx, para in enumerate(cleaned):
            if "话说天下大势" in para:
                cleaned = cleaned[idx:]
                break
    return cleaned or paragraphs


def parse_chapters() -> list[dict]:
    text = read_source_text()
    matches = list(CHAPTER_HEADING_RE.finditer(text))
    chapters: list[dict] = []
    for idx, match in enumerate(matches):
        number = chinese_to_int(match.group(1))
        title = normalize_title(match.group(2))
        body_start = match.end()
        body_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body_text = text[body_start:body_end]
        paragraphs = clean_paragraphs(number, split_paragraphs(body_text))
        chapters.append({"number": number, "title": title, "paragraphs": paragraphs})

    chapters = sorted(chapters, key=lambda item: item["number"])
    normalized = {item["number"]: item for item in chapters}
    if len(normalized) != 120:
        raise ValueError(f"Expected 120 chapters from source text, got {len(normalized)}")

    return [normalized[i] for i in range(1, 121)]


def target_event_count(paragraph_count: int) -> int:
    if paragraph_count <= 6:
        return 2
    if paragraph_count <= 12:
        return 3
    if paragraph_count <= 20:
        return 4
    if paragraph_count <= 32:
        return 5
    if paragraph_count <= 48:
        return 6
    return 7


def build_cut_candidates(paragraphs: list[str]) -> set[int]:
    candidates: set[int] = set()
    for idx in range(2, len(paragraphs) + 1):
        para = paragraphs[idx - 1]
        if para.startswith(SCENE_SHIFT_PREFIXES):
            candidates.add(idx - 1)
            continue
        if any(token in para[:14] for token in ("忽报", "正说间", "正商议间", "次日", "是夜")):
            candidates.add(idx - 1)
    return candidates


def segment_paragraphs(paragraphs: list[str]) -> list[tuple[int, int]]:
    count = len(paragraphs)
    if count <= 1:
        return [(1, max(count, 1))]

    target = target_event_count(count)
    candidates = build_cut_candidates(paragraphs)
    segments: list[tuple[int, int]] = []
    start = 1

    while start <= count:
        remain_paragraphs = count - start + 1
        remain_segments = target - len(segments)
        if remain_segments <= 1:
            segments.append((start, count))
            break

        expected_len = max(2, round(remain_paragraphs / remain_segments))
        expected_cut = min(count - 1, start + expected_len - 1)
        window_start = max(start + 1, expected_cut - 2)
        window_end = min(count - 1, expected_cut + 2)
        nearby_candidates = [c for c in range(window_start, window_end + 1) if c in candidates]
        if nearby_candidates:
            cut = min(nearby_candidates, key=lambda c: abs(c - expected_cut))
        else:
            cut = expected_cut

        if cut < start:
            cut = start
        segments.append((start, cut))
        start = cut + 1

    if not segments:
        return [(1, count)]
    return segments


def chapter_title_clauses(title: str) -> list[str]:
    parts = [part.strip() for part in re.split(r"[ ，\s]+", title) if part.strip()]
    if len(parts) >= 2:
        return parts[:2]
    if " " in title:
        split = [item.strip() for item in title.split(" ") if item.strip()]
        if split:
            return split[:2]
    return [title]


def clean_sentence_for_title(sentence: str) -> str:
    current = re.sub(r"\s+", "", sentence or "")
    for prefix in TITLE_NOISE_PREFIXES:
        if current.startswith(prefix) and len(current) >= len(prefix) + 4:
            current = current[len(prefix) :]
            break

    current = re.sub(r"“[^”]{2,160}”", "", current)
    current = re.sub(r"「[^」]{2,160}」", "", current)
    current = current.strip("：:，,。；;、（）()【】《》 ")
    if not current:
        return ""

    clauses = [item.strip("，,。；;：:、 ") for item in re.split(r"[，,；;]", current) if item.strip("，,。；;：:、 ")]
    if not clauses:
        return ""
    primary = clauses[0]
    if len(primary) < 5 and len(clauses) >= 2:
        primary = f"{primary}{clauses[1]}"

    primary = re.sub(r"(正是|后人有诗|诗曰).*", "", primary).strip()
    primary = re.sub(r"(某姓|字[\u4e00-\u9fff]{1,3}|乃[\u4e00-\u9fff]{1,2}人也).*", "", primary).strip()
    primary = re.sub(r"[^\u4e00-\u9fff0-9]", "", primary)
    return truncate(primary, 14) if primary else ""


def clause_overlap_score(clause: str, text: str) -> int:
    clause_clean = re.sub(r"[^\u4e00-\u9fff]", "", clause)
    if len(clause_clean) < 2:
        return 0
    score = 0
    seen: set[str] = set()
    for i in range(len(clause_clean) - 1):
        token = clause_clean[i : i + 2]
        if token in seen:
            continue
        seen.add(token)
        if token in text:
            score += 1
    return score


def ordinal_cn(num: int) -> str:
    mapping = {2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十"}
    return mapping.get(num, str(num))


def ensure_unique_title(title: str, used_titles: dict[str, int]) -> str:
    count = used_titles.get(title, 0) + 1
    used_titles[title] = count
    if count == 1:
        return title
    return f"{title}（其{ordinal_cn(count)}）"


def title_is_weak(title: str) -> bool:
    normalized = re.sub(r"[^\u4e00-\u9fff0-9]", "", title or "")
    if len(normalized) < 4:
        return True
    if normalized in TITLE_WEAK_EXACT:
        return True
    if any(normalized.startswith(prefix) for prefix in TITLE_NOISE_PREFIXES) and len(normalized) <= 7:
        return True
    if normalized.endswith(("一军", "一人", "时分", "当下", "于是")):
        return True
    return False


def infer_title(segment_text: str, chapter_title: str, seq: int) -> str:
    clauses = chapter_title_clauses(chapter_title)
    matched_hints: list[tuple[int, str]] = []
    for keyword, hinted in EVENT_TITLE_HINTS:
        if keyword in segment_text:
            matched_hints.append((len(keyword), hinted))
    if matched_hints:
        specific = [item for item in matched_hints if item[1] not in {"黄巾起义", "董卓乱政", "荆州风云", "汉中争锋", "出师北伐"}]
        if specific:
            specific.sort(key=lambda item: item[0], reverse=True)
            return specific[0][1]
        if seq == 1:
            matched_hints.sort(key=lambda item: item[0], reverse=True)
            return matched_hints[0][1]

    if clauses:
        clause_scores = sorted(
            [(clause_overlap_score(clause, segment_text), clause) for clause in clauses],
            key=lambda item: item[0],
            reverse=True,
        )
        if clause_scores and clause_scores[0][0] >= 2:
            return clause_scores[0][1]

    scored_candidates: list[tuple[int, str]] = []
    for idx, sentence in enumerate(split_sentences(segment_text)):
        candidate = clean_sentence_for_title(sentence)
        if title_is_weak(candidate):
            continue
        score = 0
        if any(token in sentence for token in ACTION_TOKENS):
            score += 3
        if any(alias in sentence for alias, _ in NAME_ALIASES_BY_LENGTH[:40]):
            score += 2
        if idx <= 2:
            score += 1
        score += min(2, len(candidate) // 6)
        scored_candidates.append((score, candidate))

    if scored_candidates:
        scored_candidates.sort(key=lambda item: (-item[0], len(item[1])))
        return scored_candidates[0][1]

    fallback = clean_sentence_for_title(split_sentences(segment_text)[0]) if segment_text else ""
    if fallback and not title_is_weak(fallback):
        return fallback

    return f"{truncate(chapter_title, 10)}·段{seq}"


def default_characters_for_chapter(chapter: int) -> list[str]:
    if chapter <= 9:
        return ["liubei", "guanyu", "zhangfei", "caocao", "dongzhuo", "lubu"]
    if chapter <= 33:
        return ["caocao", "liubei", "guanyu", "yuanshao", "sunquan"]
    if chapter <= 50:
        return ["liubei", "zhugeliang", "sunquan", "zhouyu", "caocao"]
    if chapter <= 85:
        return ["liubei", "guanyu", "zhugeliang", "sunquan", "caocao"]
    return ["zhugeliang", "simayi", "jiangwei", "simazhao", "simayan"]


def infer_characters(text: str, chapter: int) -> list[str]:
    stats: dict[str, dict[str, int]] = {}
    for alias, char_id in NAME_ALIASES_BY_LENGTH:
        for match in re.finditer(re.escape(alias), text):
            item = stats.setdefault(char_id, {"count": 0, "first": match.start()})
            item["count"] += 2 if len(alias) >= 3 else 1
            if match.start() < item["first"]:
                item["first"] = match.start()

    ranked: list[str] = []
    if stats:
        ranking = sorted(stats.items(), key=lambda item: (-item[1]["count"], item[1]["first"]))
        ranked = [char_id for char_id, _ in ranking[:6]]

    if len(ranked) == 1:
        only = ranked[0]
        if stats.get(only, {}).get("count", 0) <= 1:
            ranked = []

    defaults = default_characters_for_chapter(chapter)
    for char_id in defaults:
        if len(ranked) >= 4:
            break
        if char_id not in ranked:
            ranked.append(char_id)

    return ranked[:6]


def normalize_for_compare(text: str) -> str:
    return re.sub(r"[^\u4e00-\u9fff]", "", text or "")


def clean_sentence_for_summary(sentence: str) -> str:
    cleaned = re.sub(r"\s+", "", sentence or "").strip()
    if not cleaned:
        return ""
    for pattern in SUMMARY_REMOVE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned)
    cleaned = re.sub(r"（[^）]{0,40}）", "", cleaned)
    cleaned = re.sub(r"“[^”]{2,240}”", "", cleaned)
    cleaned = re.sub(r"「[^」]{2,240}」", "", cleaned)
    for prefix in SUMMARY_NOISE_PREFIXES:
        if cleaned.startswith(prefix) and len(cleaned) >= len(prefix) + 8:
            cleaned = cleaned[len(prefix) :]
            break
    cleaned = re.sub(
        r"^[\u4e00-\u9fff]{1,8}(叱曰|笑曰|答曰|问曰|喝道|说道|曰|云|道)[:：]?",
        "",
        cleaned,
    )
    cleaned = cleaned.strip("“”'‘’：:，,。；;（）()【】《》")
    cleaned = cleaned.lstrip("，。；：:、）)】")
    cleaned = re.sub(r"[，,]{2,}", "，", cleaned)
    cleaned = re.sub(r"[。]{2,}", "。", cleaned)
    if len(cleaned) < 8:
        return ""
    return cleaned


def finalize_summary_text(text: str, max_len: int) -> str:
    normalized = re.sub(r"\s+", "", text or "")
    normalized = normalized.replace("“", "").replace("”", "").replace("‘", "").replace("’", "")
    normalized = normalized.strip("，,。；;：:、")
    normalized = re.sub(r"[，,]{2,}", "，", normalized)
    normalized = re.sub(r"[。]{2,}", "。", normalized)
    if not normalized:
        return ""
    if normalized[-1] not in "。！？":
        normalized += "。"
    return truncate(normalized, max_len)


def remove_dialogue_content(text: str) -> str:
    without_quote = re.sub(r"“[^”]{2,320}”", "", text or "")
    without_quote = re.sub(r"「[^」]{2,320}」", "", without_quote)
    without_quote = re.sub(r"『[^』]{2,320}』", "", without_quote)
    return without_quote


def sanitize_summary_sentence(sentence: str) -> str:
    return clean_sentence_for_summary(remove_dialogue_content(sentence))


def sentence_is_noise(sentence: str) -> bool:
    if not sentence:
        return True
    if sentence.startswith("天下大势，分久必合"):
        return True
    if sentence.startswith(("周末七国分争", "及秦灭之后", "楚、汉分争", "汉朝自高祖")):
        return True
    if sentence.startswith(("正是", "后人有诗", "诗曰")):
        return True
    if any(fragment in sentence for fragment in SUMMARY_NOISE_SENTENCE_FRAGMENTS):
        return True
    if len(sentence) < 8:
        return True
    return False


def is_dialogue_like(sentence: str) -> bool:
    if not sentence:
        return True
    if any(token in sentence for token in ("“", "”", "「", "」", "『", "』")):
        return True
    if any(token in sentence for token in ("？", "?", "！", "!")):
        return True
    if "：" in sentence or ":" in sentence:
        return True
    if re.search(r"[\u4e00-\u9fff]{1,8}(叱曰|笑曰|答曰|问曰|喝道|说道|曰|云|道)", sentence):
        return True
    if sentence.startswith("今闻") and len(sentence) <= 40:
        return True
    if any(token in sentence for token in ("何故", "何得", "不如", "愿", "请", "臣等", "娘娘", "将军")) and len(sentence) <= 72:
        return True
    if any(token in sentence for token in ("吾", "汝", "某", "妾", "尔", "君", "公")) and len(sentence) <= 72:
        return True
    if "我" in sentence and "我军" not in sentence and len(sentence) <= 72:
        return True
    return False


def render_narrative_summary(sentences: list[str], mode: str, max_len: int) -> str:
    cleaned: list[str] = []
    seen: set[str] = set()
    for sentence in sentences:
        sanitized = sanitize_summary_sentence(sentence)
        norm = normalize_for_compare(sanitized)
        if not norm or norm in seen:
            continue
        seen.add(norm)
        cleaned.append(sanitized)
    if not cleaned:
        return ""

    if mode == "background":
        composed = cleaned[0]
    elif mode == "process":
        composed = "；".join(cleaned[:2]) if len(cleaned) >= 2 else cleaned[0]
    else:
        composed = cleaned[-1]
    return finalize_summary_text(composed, max_len)


def collect_summary_candidates(paragraphs: list[str], allow_dialogue: bool = False) -> list[tuple[int, str]]:
    candidates: list[tuple[int, str]] = []
    idx = 0
    for para in paragraphs:
        for raw_sentence in split_sentences(para):
            cleaned = sanitize_summary_sentence(raw_sentence)
            if not cleaned:
                idx += 1
                continue
            if sentence_is_noise(cleaned):
                idx += 1
                continue
            if not allow_dialogue and is_dialogue_like(raw_sentence):
                idx += 1
                continue
            candidates.append((idx, cleaned))
            idx += 1
    return candidates


def score_summary_sentence(sentence: str, idx: int, total: int, mode: str, char_ids: list[str]) -> float:
    score = 0.0
    length = len(sentence)
    if 12 <= length <= 54:
        score += 2.0
    elif 9 <= length <= 72:
        score += 1.0
    else:
        score -= 1.0

    for cid in char_ids:
        name = CHAR_NAME_BY_ID.get(cid)
        if name and name in sentence:
            score += 0.9

    if any(token in sentence for token in ACTION_TOKENS):
        score += 1.2
    if any(token in sentence for token in SETTING_TOKENS):
        score += 0.3
    if "曰" in sentence or "云" in sentence:
        score -= 1.8
    if any(token in sentence for token in BIOGRAPHY_NOISE_TOKENS):
        score -= 1.2
    if any(token in sentence for token in DESCRIPTION_NOISE_TOKENS):
        score -= 1.5

    if mode == "background":
        if idx <= max(1, total // 3):
            score += 1.5
        if any(token in sentence for token in ("诏", "命", "朝廷", "州", "郡", "京师", "太守")):
            score += 0.8
    elif mode == "process":
        if 0 < idx < total - 1:
            score += 0.8
        if any(token in sentence for token in PROCESS_HINT_TOKENS):
            score += 1.0
        else:
            score -= 1.1
        if any(token in sentence for token in ("遂", "乃", "便", "即", "于是", "忽", "引军", "交战", "追赶")):
            score += 1.0
    elif mode == "result":
        if idx >= max(0, total - 4):
            score += 2.3
        if idx <= total // 2:
            score -= 1.9
        if any(token in sentence for token in RESULT_HINT_TOKENS):
            score += 2.0
        else:
            score -= 0.8
        if any(token in sentence for token in ("于是", "遂", "乃", "自此", "大败", "败走", "斩", "降", "归", "平", "克", "成")):
            score += 1.0

    return score


def choose_summary_sentences(
    paragraphs: list[str],
    mode: str,
    char_ids: list[str],
    limit: int,
    avoid_texts: list[str] | None = None,
) -> list[str]:
    avoid_norm = {normalize_for_compare(text) for text in (avoid_texts or []) if text}
    candidates = collect_summary_candidates(paragraphs, allow_dialogue=False)
    if not candidates:
        if mode == "result":
            return []
        candidates = collect_summary_candidates(paragraphs, allow_dialogue=True)
    if not candidates:
        return []

    total = len(candidates)
    if mode == "background":
        pool = [item for item in candidates if item[0] <= max(2, total // 3)]
    elif mode == "process":
        lower = max(0, total // 4)
        upper = max(lower + 1, (total * 4) // 5)
        pool = [item for item in candidates if lower <= item[0] <= upper]
    else:
        pool = [item for item in candidates if item[0] >= max(0, (total * 2) // 3)]
    if not pool:
        pool = candidates

    if mode == "process":
        if not any(token in item[1] for item in pool for token in PROCESS_HINT_TOKENS):
            pool = candidates
        action_pool = [item for item in pool if any(token in item[1] for token in PROCESS_HINT_TOKENS)]
        if action_pool:
            pool = action_pool + [item for item in pool if item not in action_pool]

    if mode == "result":
        hinted_pool = [item for item in pool if any(token in item[1] for token in RESULT_HINT_TOKENS)]
        if hinted_pool:
            pool = hinted_pool
        else:
            latest_pool = sorted(pool, key=lambda item: item[0], reverse=True)
            for idx, sentence in latest_pool:
                norm = normalize_for_compare(sentence)
                if norm and norm not in avoid_norm:
                    return [sentence]
            pool = latest_pool[: max(3, limit + 1)]

    scored = [
        (score_summary_sentence(sentence, idx, total, mode, char_ids), idx, sentence)
        for idx, sentence in pool
    ]
    scored.sort(key=lambda item: (-item[0], item[1]))

    picked: list[tuple[int, str]] = []
    used_norm: set[str] = set()
    for score, idx, sentence in scored:
        norm = normalize_for_compare(sentence)
        if not norm:
            continue
        if norm in avoid_norm or norm in used_norm:
            continue
        min_followup_score = 1.4 if mode == "process" else 0.2
        if score < min_followup_score and picked:
            continue
        picked.append((idx, sentence))
        used_norm.add(norm)
        if len(picked) >= limit:
            break

    if not picked:
        fallback_idx, fallback_sentence = pool[-1] if mode == "result" else pool[0]
        return [fallback_sentence]

    picked.sort(key=lambda item: item[0])
    return [sentence for _, sentence in picked]


def summarize_background(paragraphs: list[str], char_ids: list[str]) -> str:
    chosen = choose_summary_sentences(paragraphs, mode="background", char_ids=char_ids, limit=1)
    text = render_narrative_summary(chosen, mode="background", max_len=92)
    return text or "本段叙事承接前章，推动新一轮冲突。"


def summarize_process(paragraphs: list[str], char_ids: list[str], background: str) -> str:
    chosen = choose_summary_sentences(
        paragraphs,
        mode="process",
        char_ids=char_ids,
        limit=2,
        avoid_texts=[background],
    )
    if len(chosen) >= 2:
        second = chosen[1]
        if any(token in second for token in BIOGRAPHY_NOISE_TOKENS) or not any(
            token in second for token in PROCESS_HINT_TOKENS
        ):
            chosen = chosen[:1]
    text = render_narrative_summary(chosen, mode="process", max_len=146)
    if normalize_for_compare(text) == normalize_for_compare(background) or len(normalize_for_compare(text)) < 10:
        retry = choose_summary_sentences(paragraphs, mode="process", char_ids=char_ids, limit=1, avoid_texts=[])
        text = render_narrative_summary(retry, mode="process", max_len=146)
    if normalize_for_compare(text) == normalize_for_compare(background) or len(normalize_for_compare(text)) < 10:
        return "多方势力继续调兵布阵，冲突由筹划转入实战。"
    if not text:
        return "多方人物在同一时空交汇，推动情节向前。"
    return text


def summarize_result(paragraphs: list[str], char_ids: list[str], background: str, process: str) -> str:
    chosen = choose_summary_sentences(
        paragraphs,
        mode="result",
        char_ids=char_ids,
        limit=1,
        avoid_texts=[background, process],
    )
    text = render_narrative_summary(chosen, mode="result", max_len=96)
    text_norm = normalize_for_compare(text)
    if text_norm in {normalize_for_compare(background), normalize_for_compare(process)} or len(text_norm) < 8:
        return "事件收束后，人物关系与后续局势随之改写。"
    return text or "事件结束后，人物关系与局势随之变化。"


def pick_quote(paragraphs: list[str]) -> str:
    merged = "".join(paragraphs)
    quote_matches = [text for text in re.findall(r"“([^”]{4,120})”", merged) if len(text.strip()) >= 10]
    if quote_matches:
        return truncate(quote_matches[0], 64)

    sentences = split_sentences(merged)
    for sentence in sentences:
        sentence = sentence.strip()
        if 10 <= len(sentence) <= 80:
            return truncate(sentence, 64)
    sentence = sentences[0] if sentences else merged
    return truncate(sentence, 64)


def pick_speaker(quote: str, segment_text: str, char_ids: list[str]) -> str:
    def resolve_name(name_text: str) -> str | None:
        if name_text in NAME_KEYWORDS:
            return NAME_KEYWORDS[name_text]
        for alias, char_id in NAME_ALIASES_BY_LENGTH:
            if alias in name_text:
                return char_id
        return None

    speech_patterns = r"([\u4e00-\u9fff]{1,6})(?:大叫|喝道|叱曰|笑曰|答曰|曰|云|道)"
    if quote:
        quote_index = segment_text.find(quote)
        if quote_index >= 0:
            context_start = max(0, quote_index - 36)
            context = segment_text[context_start:quote_index]
            matches = list(re.finditer(speech_patterns, context))
            for matched in reversed(matches):
                cid = resolve_name(matched.group(1))
                if cid:
                    return cid

    matches = list(re.finditer(speech_patterns, segment_text))
    for matched in matches:
        cid = resolve_name(matched.group(1))
        if cid:
            return cid

    return char_ids[0]


def impact_score(segment_text: str, char_ids: list[str], chapter: int, seq: int) -> int:
    action_bonus = 0
    if any(token in segment_text for token in ACTION_TOKENS):
        action_bonus += 10
    if any(token in segment_text for token in ("受禅", "称帝", "归一", "赤壁", "官渡", "五丈原")):
        action_bonus += 8
    base = 56 + len(char_ids) * 4 + action_bonus + (chapter % 7) + (1 if seq == 1 else 0)
    return max(52, min(99, base))


def find_event_by_keywords(events: list[dict], keywords: tuple[str, ...], fallback: str) -> str:
    for event in events:
        text = f"{event['title']}{event['process']}{event['result']}"
        if all(keyword in text for keyword in keywords):
            return event["id"]
    return fallback


def build_dataset():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    raw_chapters = parse_chapters()

    chapters: list[dict] = []
    events: list[dict] = []
    dialogues: list[dict] = []
    evidence: list[dict] = []
    coverage: list[dict] = []
    char_ranges: dict[str, list[int]] = {cid: [] for cid, *_ in CHARACTER_CATALOG}

    for item in raw_chapters:
        chapter_num = item["number"]
        chapter_title = item["title"] or default_title(chapter_num)
        period_id = period_for_chapter(chapter_num)
        paragraphs = item["paragraphs"]

        chapters.append(
            {"id": f"ch_{chapter_num:03d}", "number": chapter_num, "title": chapter_title, "period_id": period_id}
        )

        if not paragraphs:
            paragraphs = [chapter_title]

        segments = segment_paragraphs(paragraphs)
        paragraph_to_event: dict[int, str] = {}
        used_titles: dict[str, int] = defaultdict(int)

        for seq, (start, end) in enumerate(segments, start=1):
            segment_paragraphs_text = paragraphs[start - 1 : end]
            segment_text = "".join(segment_paragraphs_text)
            event_id = f"ev_{chapter_num:03d}_{seq}"
            evidence_id = f"evi_{chapter_num:03d}_{seq}"
            dialogue_id = f"dlg_{chapter_num:03d}_{seq}"

            raw_title = infer_title(segment_text, chapter_title, seq)
            if raw_title in used_titles:
                # Keep canonical hinted titles and let ensure_unique_title append suffix.
                if raw_title not in HINT_TITLE_SET:
                    first_sentence = split_sentences(segment_text)[0] if segment_text else ""
                    alt_title = clean_sentence_for_title(first_sentence)
                    if alt_title and len(alt_title) >= 4 and alt_title not in used_titles:
                        raw_title = alt_title
            title = ensure_unique_title(raw_title, used_titles)
            char_ids = infer_characters(segment_text + chapter_title, chapter_num)
            for cid in char_ids:
                if cid in char_ranges:
                    char_ranges[cid].append(chapter_num)

            background = summarize_background(segment_paragraphs_text, char_ids)
            process = summarize_process(segment_paragraphs_text, char_ids, background)
            result = summarize_result(segment_paragraphs_text, char_ids, background, process)
            quote_excerpt = pick_quote(segment_paragraphs_text)
            if len(quote_excerpt) < 10:
                quote_excerpt = truncate(segment_text, 36)
            speaker_id = pick_speaker(quote_excerpt, segment_text, char_ids)
            score = impact_score(segment_text, char_ids, chapter_num, seq)

            events.append(
                {
                    "id": event_id,
                    "chapter": chapter_num,
                    "period_id": period_id,
                    "seq_in_chapter": seq,
                    "title": title,
                    "background": background,
                    "process": process,
                    "result": result,
                    "impact_score": score,
                    "character_ids": char_ids,
                    "evidence_ref_ids": [evidence_id],
                }
            )

            evidence.append(
                {
                    "id": evidence_id,
                    "chapter": chapter_num,
                    "paragraph_start": start,
                    "paragraph_end": end,
                    "quote_excerpt": quote_excerpt or truncate(segment_text, 64),
                    "source_version": SOURCE_VERSION,
                }
            )

            dialogues.append(
                {
                    "id": dialogue_id,
                    "event_id": event_id,
                    "speaker_id": speaker_id,
                    "excerpt": quote_excerpt or truncate(process, 54),
                    "full_text": truncate(segment_text, 220),
                    "evidence_ref_ids": [evidence_id],
                }
            )

            for paragraph_idx in range(start, end + 1):
                paragraph_to_event[paragraph_idx] = event_id

        for paragraph_idx in range(1, len(paragraphs) + 1):
            event_id = paragraph_to_event.get(paragraph_idx, f"ev_{chapter_num:03d}_1")
            coverage.append({"chapter": chapter_num, "paragraph": paragraph_idx, "event_id": event_id})

    characters: list[dict] = []
    for cid, name, camp, title, intro in CHARACTER_CATALOG:
        chapters_seen = sorted(char_ranges.get(cid, []))
        if chapters_seen:
            first_chapter = chapters_seen[0]
            last_chapter = chapters_seen[-1]
        elif camp == "晋":
            first_chapter, last_chapter = 86, 120
        elif camp == "吴":
            first_chapter, last_chapter = 8, 120
        elif camp == "蜀":
            first_chapter, last_chapter = 1, 105
        elif camp == "魏":
            first_chapter, last_chapter = 1, 100
        else:
            first_chapter, last_chapter = 1, 120

        aliases = [name]
        importance = 10 if cid in {"liubei", "caocao", "sunquan", "zhugeliang", "simayi"} else 7
        characters.append(
            {
                "id": cid,
                "name": name,
                "aliases": aliases,
                "camp": camp,
                "title": title,
                "intro": intro,
                "avatar_url": f"/avatars/{cid}.svg",
                "first_chapter": first_chapter,
                "last_chapter": last_chapter,
                "importance": importance,
            }
        )

    events_sorted = sorted(events, key=lambda item: (item["chapter"], item["seq_in_chapter"]))

    epilogue = [
        {
            "id": "epi_1",
            "order": 1,
            "title": "高平陵政变",
            "summary": "司马懿发动高平陵政变，曹魏中枢权力结构出现根本转移。",
            "linked_event_ids": [find_event_by_keywords(events_sorted, ("高平陵",), "ev_109_1")],
        },
        {
            "id": "epi_2",
            "order": 2,
            "title": "司马氏执政",
            "summary": "司马师、司马昭相继掌政，魏室名存实亡。",
            "linked_event_ids": [find_event_by_keywords(events_sorted, ("司马昭",), "ev_114_1")],
        },
        {
            "id": "epi_3",
            "order": 3,
            "title": "灭蜀之战",
            "summary": "邓艾、钟会伐蜀成功，蜀汉政权终结。",
            "linked_event_ids": [find_event_by_keywords(events_sorted, ("灭蜀",), "ev_119_1")],
        },
        {
            "id": "epi_4",
            "order": 4,
            "title": "司马炎受禅",
            "summary": "司马炎受禅建立西晋，完成对曹魏的制度替代。",
            "linked_event_ids": [find_event_by_keywords(events_sorted, ("受禅",), "ev_119_2")],
        },
        {
            "id": "epi_5",
            "order": 5,
            "title": "西晋灭吴",
            "summary": "晋灭东吴，三国格局终结，天下归一。",
            "linked_event_ids": [find_event_by_keywords(events_sorted, ("归一",), "ev_120_2")],
        },
    ]

    payload = {
        "periods": PERIODS,
        "chapters": chapters,
        "characters": sorted(characters, key=lambda item: item["first_chapter"]),
        "events": events_sorted,
        "dialogues": sorted(dialogues, key=lambda item: item["id"]),
        "evidence": sorted(evidence, key=lambda item: item["id"]),
        "coverage": sorted(coverage, key=lambda item: (item["chapter"], item["paragraph"])),
        "epilogue": epilogue,
    }

    for key, data in payload.items():
        (DATA_DIR / f"{key}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    (DATA_DIR / "dataset.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        "[full_build] "
        f"chapters={len(payload['chapters'])} "
        f"events={len(payload['events'])} "
        f"dialogues={len(payload['dialogues'])} "
        f"evidence={len(payload['evidence'])}"
    )


if __name__ == "__main__":
    build_dataset()
