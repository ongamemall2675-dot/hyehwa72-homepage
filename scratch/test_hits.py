import urllib.request
import re
try:
    req = urllib.request.Request('https://hits.seeyoufarm.com', headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    html = response.read().decode('utf-8')
    matches = re.findall(r'https://hits\.seeyoufarm\.com/api/count/incr/badge\.svg\?[^\"]+', html)
    print('Matches:', matches)
except Exception as e:
    print('error:', e)
