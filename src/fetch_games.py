import requests
import json
import os
import glob
import time

cookies = {
    'u:location': '%7B%22countryCode%22%3A%22US%22%2C%22ccode3%22%3A%22USA%22%2C%22timezone%22%3A%22America%2FNew_York%22%2C%22ip%22%3A%222600%3A1700%3A7ee%3A14d0%3A381a%3A1572%3A2aae%3A2ae4%22%2C%22regionId%22%3A%22NC%22%2C%22regionName%22%3A%22North%20Carolina%22%2C%22metroCode%22%3A%22560%22%7D',
}

headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'dnt': '1',
    'priority': 'u=1, i',
    'referer': 'https://www.fotmob.com/leagues/',
    'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'x-fm-req': 'eyJib2R5Ijp7InVybCI6Ii9hcGkvbGVhZ3Vlcz9pZD00NyZjY29kZTM9VVNBX05DIiwiY29kZSI6MTczMDMzNDY0MTcyOX0sInNpZ25hdHVyZSI6IjU1QUU1NUFEOEQ5QUExQzhBRUVFMDc2RTg3MjNBRjI3In0=',
}

params = {
    'id': '47',
    'ccode3': 'USA_NC',
}

# PREM_URL = r"https://www.fotmob.com/api/leagues?id=47"
PREM_URL = r"https://www.fotmob.com/api/leagues?id=47&ccode3=USA_NC"
GAME_URL = r"https://www.fotmob.com/api/matchDetails?matchId={match_id}"

def fetch_game_ids():
    r = requests.get('https://www.fotmob.com/api/leagues', cookies=cookies, params=params, headers=headers)
    games = r.json()['matches']['allMatches']
    return games

def download_game_data(game):
    game_id = game['id']
    file_name = f"../data/{game_id}.json"
    if os.path.exists(file_name):
        print(f"Game {game_id} data exists, skipping...")
        return
    else:
        print(f"Requesting game {game_id}...")
    r = requests.get(GAME_URL.format(match_id=game_id), cookies=cookies, headers=headers)
    if r.status_code == 200:
        try:
            json_data = r.json()
        except requests.exceptions.JSONDecodeError as e:
            print("Cannot read JSON, incomplete data?")
            print(r.text)
            return
        if not json_data['general']['started'] or not json_data['general']['finished']:
            print(f"Game {game_id} is not finished, skipping...")
            return
        with open(file_name, "w") as f:
            json.dump(json_data, f)
            print(f"Game {game_id} is downloaded!")
        time.sleep(1)
    else:
        print("Request is not successful")
        print(r.status_code)
        time.sleep(5)

def generate_index():
    game_files = glob.glob("../data/*.json")
    games = []
    for g in game_files:
        with open(g) as f:
            d = json.load(f)
        games.append(d['general'])
    with open("../index.json", "w") as f:
        json.dump(games, f, indent=2)

if __name__ == "__main__":
    games = fetch_game_ids()
    print(f"Total number of games: {len(games)}")
    for g in games:
        download_game_data(g)
    generate_index()

