---

### 📝 The "Add a New School" Master Cheat Sheet

#### Step 1: The Data (`data/ucc.json`)

Create your new JSON file in the `data/` folder. Use the clean dictionary format:

```json
{
  "university_name": "University of Cape Coast",
  "short_code": "UCC",
  "programs": [
      // ... all the program objects go here ...
  ]
}

```

#### Step 2: The Backend Instance (`seed_db.py`)

Open your seeder script. At the top, where you create the parent universities, you must define the new school and add it to the database session:

```python
    # 1. Create Parent University Instances
    ug_uni = University(name="University of Ghana", short_code="UG")
    knust_uni = University(name="Kwame Nkrumah University...", short_code="KNUST")
    uds_uni = University(name="University for Development Studies", short_code="UDS")
    
    # ADD THESE TWO LINES FOR THE NEW SCHOOL:
    ucc_uni = University(name="University of Cape Coast", short_code="UCC") 
    
    db.session.add(ug_uni)
    db.session.add(knust_uni)
    db.session.add(uds_uni)
    db.session.add(ucc_uni) # <-- Add it to the session flush
    db.session.flush()

```

#### Step 3: The Backend Processing Block (`seed_db.py`)

Scroll to the bottom of `seed_db.py` (right above `db.session.commit()`) and copy/paste a previous block to process the new file. Just change the variable names to match your new school (`ucc_path`, `ucc_data`, `ucc_uni.id`):

```python
    # 5. Process UCC Data Assets
    ucc_path = os.path.join('data', 'ucc.json')
    if os.path.exists(ucc_path):
        with open(ucc_path, 'r', encoding='utf-8') as f:
            ucc_data = json.load(f)
            programs_list = ucc_data.get('programs', ucc_data) if isinstance(ucc_data, dict) else ucc_data

            for item in programs_list:
                reqs = item.get('requirements', item)
                prog = Program(
                    university_id=ucc_uni.id, # <-- Ensure this matches the variable from Step 2
                    name=item['program_name'],
                    cutoff_aggregate=item['cutoff_aggregate'],
                    requirements=reqs
                )
                db.session.add(prog)
        print("Successfully seeded UCC programmatic assets.")

```

#### Step 4: The Frontend Dropdown (`app/templates/index.html`)

Open your HTML file and add the new school as an `<option>` inside your `universitySelector` dropdown. **Ensure the `value` perfectly matches the `short_code` in your JSON!**

```html
<select id="universitySelector" ...>
    <option value="UG">University of Ghana (Legon)</option>
    <option value="KNUST">Kwame Nkrumah University of Science...</option>
    <option value="UDS">University for Development Studies (UDS)</option>
    <option value="UCC">University of Cape Coast (UCC)</option> </select>

```

#### Step 5: The Frontend Logic (`app/static/main.js`)

Open your JavaScript file, find the `displayResults` function, and add one more `else if` line to tell the UI what name to print at the top of the results card:

```javascript
    if (summaryUni) {
        if (uniCode === 'UG') summaryUni.innerText = 'University of Ghana';
        else if (uniCode === 'KNUST') summaryUni.innerText = 'KNUST';
        else if (uniCode === 'UDS') summaryUni.innerText = 'University for Development Studies';
        else if (uniCode === 'UCC') summaryUni.innerText = 'University of Cape Coast'; // ADDED
    }

```

---

### 🚀 The Execution Command Sequence

When those files are updated, run this exact sequence to push it live:

**1. Test it locally first:**

```bash
python seed_db.py
python run.py

```

**2. Push to the Cloud (Local VS Code Terminal):**

```bash
git add .
git commit -m "Added UCC to the platform"
git push origin main

```

**3. Update Live Server (PythonAnywhere Bash Console):**

```bash
git pull origin main
python seed_db.py

```

**4. The Final Step:**
Go to the **Web** tab on PythonAnywhere and click the big green **Reload** button.