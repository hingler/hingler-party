ver_major=$(cat versionnum.txt | head -n 1)
ver_minor=$(cat versionnum.txt | sed -n 2p)
ver_build=$(cat versionnum.txt | sed -n 3p)

ver_build=$((ver_build + 1))

rm versionnum.txt
rm versionNumber.ts

touch versionNumber.ts

echo "export const VER_MAJOR=$ver_major;" >> versionNumber.ts
echo "export const VER_MINOR=$ver_minor;" >> versionNumber.ts
echo "export const VER_BUILD=$ver_build;" >> versionNumber.ts
echo "export const CACHE_NAME='hingler-cache';" >> versionNumber.ts

touch versionnum.txt
echo "$ver_major" >> versionnum.txt
echo "$ver_minor" >> versionnum.txt
echo "$ver_build" >> versionnum.txt
