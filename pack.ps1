echo "Run: npm update @babel/core, and get version"
npm update @babel/core -s
$version = (npm view @babel/core version)
echo "@babel/core version is $version"

echo "Run: npm update browserify"
npm update browserify -s

# set indir and outdir
$indir = "./src"
$outdir = "./dist"

# 获取indir下的文件列表， 存为files
$files = Get-ChildItem $indir -File

# 遍历files， 依次用babel-browserify将文件转为浏览器可用的js文件
foreach ($file in $files) {
    echo "Run: node ./node_modules/browserify/bin/cmd.js $indir/$file -o $outdir/$file"
    node ./node_modules/browserify/bin/cmd.js "$indir/$file" -o "$outdir/$file"
}
