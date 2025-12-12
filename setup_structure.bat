@echo off
echo ========================================================
echo      TECHNAAM.COM - AUTOMATED ARCHITECTURE SETUP
echo ========================================================
echo.

REM --- 1. Check if we are in the right folder ---
if not exist "src" (
    echo [ERROR] 'src' folder not found! 
    echo Please make sure you are running this file from the root of 'technaam-web'.
    pause
    exit
)

echo [1/3] Creating Folder Hierarchy...

REM --- 2. Create Directory Structure ---

REM App Pages
if not exist "src\app\about" mkdir "src\app\about"
if not exist "src\app\contact" mkdir "src\app\contact"
if not exist "src\app\products" mkdir "src\app\products"
if not exist "src\app\services" mkdir "src\app\services"
if not exist "src\app\legal-tools" mkdir "src\app\legal-tools"
if not exist "src\app\blog" mkdir "src\app\blog"

REM Components Grouping
if not exist "src\components\ui" mkdir "src\components\ui"
if not exist "src\components\layout" mkdir "src\components\layout"
if not exist "src\components\sections" mkdir "src\components\sections"
if not exist "src\components\maps" mkdir "src\components\maps"
if not exist "src\components\icons" mkdir "src\components\icons"

REM Lib & Utilities
if not exist "src\lib" mkdir "src\lib"
if not exist "src\types" mkdir "src\types"
if not exist "src\hooks" mkdir "src\hooks"

echo [2/3] Creating Placeholder Files...

REM --- 3. Create Empty Component Files (Ready for Code) ---

REM Layout Components
type nul > "src\components\layout\Navbar.tsx"
type nul > "src\components\layout\Footer.tsx"

REM UI Components (Buttons, Cards)
type nul > "src\components\ui\Button.tsx"
type nul > "src\components\ui\Card.tsx"
type nul > "src\components\ui\SectionWrapper.tsx"

REM Sections (Hero, Features)
type nul > "src\components\sections\Hero.tsx"
type nul > "src\components\sections\ProductGrid.tsx"
type nul > "src\components\sections\ServicesList.tsx"
type nul > "src\components\sections\CallToAction.tsx"

REM Maps
type nul > "src\components\maps\GoogleMapSection.tsx"

REM Pages (The main routes)
type nul > "src\app\contact\page.tsx"
type nul > "src\app\about\page.tsx"
type nul > "src\app\products\page.tsx"
type nul > "src\app\services\page.tsx"
type nul > "src\app\legal-tools\page.tsx"

REM Utilities
type nul > "src\lib\utils.ts"
type nul > "src\lib\constants.ts"

echo.
echo [3/3] Structure Created Successfully!
echo ========================================================
echo You can now delete 'setup_structure.bat' if you wish.
echo Open 'src/components' to see your new architecture.
echo ========================================================
pause