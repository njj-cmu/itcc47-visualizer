# Fixture contract: a finite acyclic tree; byte counts are nonnegative ints.
# This example does not read the real filesystem or follow symlinks.
def total_size(node):
    if node["kind"] == "file":
        return node["bytes"]
    total = 0
    for child in node["children"]:
        child_total = total_size(child)
        total = total + child_total
    return total


SAMPLE_FOLDER = {
    "kind": "folder", "name": "Course", "children": [
        {"kind": "file", "name": "notes.txt", "bytes": 120},
        {"kind": "file", "name": "index.txt", "bytes": 80},
        {"kind": "folder", "name": "Examples", "children": [
            {"kind": "file", "name": "a.py", "bytes": 40},
            {"kind": "file", "name": "b.py", "bytes": 60},
        ]},
        {"kind": "folder", "name": "Data", "children": [
            {"kind": "folder", "name": "Raw", "children": [
                {"kind": "file", "name": "input.txt", "bytes": 200},
            ]},
        ]},
    ],
}


if __name__ == "__main__":
    answer = total_size(SAMPLE_FOLDER)
    print(answer)
