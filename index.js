const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'default_token';

app.use(express.json());

// Middleware zur Authentifizierung
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7, authHeader.length);
        if (token === BEARER_TOKEN) {
            return next();
        }
    }
    return res.status(403).json({ message: 'Forbidden' });
};

// Helper-Funktion zum Lesen und Schreiben der JSON-Datei
const readEntries = () => {
    try {
        const data = fs.readFileSync('data.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const writeEntries = (entries) => {
    fs.writeFileSync('data.json', JSON.stringify(entries, null, 2), 'utf8');
};


// Endpunkt zum Abrufen aller Einträge (authentifiziert)
app.get('/entries', authenticate, (req, res) => {
    const entries = readEntries();
    res.json(entries);
});

// Endpunkt zum Abrufen und Weiterleiten von Slugs
app.get('/:slug', (req, res) => {
    const entries = readEntries();
    const slug = req.params.slug;
    if (entries[slug]) {
        res.redirect(entries[slug]);
    } else {
        res.status(404).json({ message: 'Slug not found' });
    }
});


// Endpunkt zum Hinzufügen einer neuen URL
app.post('/entry', authenticate, (req, res) => {
    const { url, slug } = req.body;

    if (!url || typeof url !== 'string' || !url.match(/^https?:\/\/[^\s$.?#].[^\s]*$/)) {
        return res.status(400).json({ message: 'Invalid URL' });
    }

    const entries = readEntries();
    const newSlug = slug || generateSlug();

    if (slug && entries[slug]) {
        return res.status(400).json({ message: 'Slug already exists' });
    }

    entries[newSlug] = url;
    writeEntries(entries);

    res.status(201).json({ message: 'Entry added', slug: newSlug, url: url });
});


// Endpunkt zum Löschen eines Eintrags
app.delete('/entry/:slug', authenticate, (req, res) => {
    const entries = readEntries();
    const slug = req.params.slug;
    if (entries[slug]) {
        delete entries[slug];
        writeEntries(entries);
        res.json({ message: 'Entry deleted' });
    } else {
        res.status(404).json({ message: 'Slug not found' });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const generateSlug = () => {
    return Math.random().toString(36).substr(2, 8);
};