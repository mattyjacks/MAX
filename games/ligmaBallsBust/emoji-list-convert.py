import csv
import os

def convert_csv_to_js():
    # Read the CSV file
    csv_path = os.path.join('lbb-1b', 'emoji-list.csv')
    js_path = os.path.join('lbb-1b', 'emojiList.js')
    
    emojis = []
    
    with open(csv_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            if row['EMOJI']:  # Only add non-empty emojis
                emojis.append({
                    'id': int(row['ID']),
                    'emoji': row['EMOJI']
                })
    
    # Create the JavaScript content
    js_content = 'const emojiList = [\n'
    # Add emojis in groups of 5 for readability
    for i in range(0, len(emojis), 5):
        emoji_group = emojis[i:i+5]
        js_content += '    ' + ', '.join(f'{{ id: {e["id"]}, emoji: "{e["emoji"]}" }}' for e in emoji_group) + ',\n'
    
    # Remove the last comma and newline, and close the array
    js_content = js_content.rstrip(',\n') + '\n];\n\n'
    # Add export statement
    js_content += 'export { emojiList };'
    
    # Write to the JavaScript file
    with open(js_path, 'w', encoding='utf-8') as file:
        file.write(js_content)
    
    print(f"Successfully converted {len(emojis)} emojis to {js_path}")

if __name__ == '__main__':
    convert_csv_to_js()
