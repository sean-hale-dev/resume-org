import json, random, string, pprint

class FileInterface:
    def __init__(self, filename=None):
        self.filename = filename
        self.data = None

        self._load()
        self._spawnRoot()

    def __str__(self):
        return pprint.pformat(self.data)

    def _generateAlphabetBranchs(self, depth):
        root_prototype = {
            "depth": depth,
            "petals": None,
            "branch": None,
            "memberOfProperLength": False
        }

        return root_prototype 


    def _spawnRoot(self):
        if not self.data:
            self.data = {}
            for let in string.ascii_lowercase + '*': self.data[let] = self._generateAlphabetBranchs(3)

    def _load(self):
        if self.filename: 
            with open(self.filename, 'r') as f:
                self.data = json.load(f)
                f.close()
        else:
            self.filename = ''.join(random.choice(string.ascii_letters) for _ in range(32)) + '.json'

    def _save(self):
        if self.data:
            with open(self.filename, 'w') as f:
                json.dump(self.data, f)
                f.close()

    def __del__(self):
        # self._save()
        pass
    
    def __contains__(self, word):
        if not isinstance(word, str): return False 

        word = word.lower()

        word_idx = 0

        key = word[word_idx]
        if not key.isalpha(): key = '*'

        word_idx = min(len(word) - 1, 3)

        node = self.data[key]
        key = word[word_idx]

        while node['branch'] is not None and key in node['branch'].keys() and len(word) > node['depth']: 
            key = word[word_idx]
            if not key.isalpha(): key = "*"
            node = node['branch'][key]
            word_idx = node['depth']

        return node['petals'] is not None and word in node['petals']

    def __add__(self, word):
        if word in self or not isinstance(word, str): return

        word = word.lower()

        word_idx = 0
        key = word[word_idx] 
        if not key.isalpha(): key = '*'

        node = self.data[key]

        word_idx = 3

        while node['branch'] is not None and key in node['branch'] and len(word) > node['depth']:
            key = word[word_idx]
            if not key.isalpha(): key = '*'
            node = node['branch'][key]
            word_idx = node['depth']

        if not node['petals']: node['petals'] = [ word ]
        else: node['petals'].append(word)

        if len(word) <= node['depth']: node['memberOfProperLength'] = True
                
        if node['memberOfProperLength']:
            move_list = node['petals'].copy()
            node['petals'].clear()
        
            for w in move_list:
                if len(w) <= node['depth']:
                    if not node['petals']: node['petals'] = [ w ]
                    else: node['petals'].append(w)

                    if (len(w) <= 3 and node['depth']) or len(w) == node['depth']: node['memberOfProperLength'] = True
                else:
                    navNode = node
                    w_key = w[navNode['depth']]
                    if not w_key.isalpha(): w_key = '*'
                    
                    while len(w) <= navNode['depth'] and 


            # for i in range(len(move_list)):
            #     if len(move_list[i]) <= node['depth']: node['petals'].append(move_list[i])
            #     else:
            #         key = move_list[i][node['depth']]
            #         if not key.isalpha(): key = '*'
            #         if node['branch'] is None: node['branch'] = {}
            #         if key not in node['branch'].keys(): 
            #             node['branch'][key] = self._generateAlphabetBranchs(node['depth'] + 1)
            #             node['branch'][key]['petals'] = [ move_list[i] ]

    def save(self):
        self._save()
            
            


if __name__ == "__main__":
    db = FileInterface()
    db + "West"
    db + "Musky balls"
    db + "musk"
    db + "musky"
    db + "Men"
    db + "Meep"
    db + "Meeee"

    if ( "Musky Balls" in db ): print ("We chillin")
    else: print("Totally not cool") 
    
    db.save()



