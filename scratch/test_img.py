import xml.etree.ElementTree as ET
import re

tree = ET.parse('scratch/naver.xml')
root = tree.getroot()

for item in root.findall('.//item')[:3]:
    title = item.find('title').text
    desc = item.find('description').text
    print('TITLE:', title)
    
    img_regex = re.compile(r'<img[^>]+src=[\'"]([^\'">\s]+)[\'"]', re.IGNORECASE)
    matches = img_regex.findall(desc)
    print('IMAGES FOUND IN DESC:')
    for match in matches:
        print('  - ' + match)
    print('-'*50)
