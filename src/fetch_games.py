import requests
import json
import os
import glob
import time

PREM_URL = r"https://www.fotmob.com/api/leagues?id=47"
GAME_URL = r"https://www.fotmob.com/api/matchDetails?matchId={match_id}"

def fetch_game_ids():
    r = requests.get(PREM_URL)
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
    r = requests.get(GAME_URL.format(match_id=game_id))
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
        time.sleep(0.5)
    else:
        print("Request is not successful")
        print(r.status_code)
        time.sleep(1)

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

