import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    text = f.read()

old_str = r'.replace(/\?type=[a-zA-Z0-9]+$/, "?type=w800")'
new_str = r'.split("?")[0]'

text = text.replace(old_str, new_str)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(text)

print("Replaced!")
