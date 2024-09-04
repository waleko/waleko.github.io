for file in images/*.{jpg,png}; do
    [ ! -f "tn/$file" ] && convert "$file"  -thumbnail 300x300 "tn/$file"
done