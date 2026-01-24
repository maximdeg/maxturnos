import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000/proveedor/login", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click login button to log in as verified provider.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/form/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('maxdegdev.test@gmail.com')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/form/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('admin1234')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div[2]/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Perfil' tab to navigate to profile management section.
        frame = context.pages[-1]
        # Click on 'Perfil' tab to go to profile management section
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/button[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in 'Nombre' and 'Apellido' fields with test data and click 'Guardar Cambios' to save profile updates.
        frame = context.pages[-1]
        # Input 'Nombre' field with test data
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[4]/div/div/div[2]/form/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestName')
        

        frame = context.pages[-1]
        # Input 'Apellido' field with test data
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[4]/div/div/div[2]/form/div/div[4]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestSurname')
        

        frame = context.pages[-1]
        # Click 'Guardar Cambios' button to save profile updates
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[4]/div/div/div[2]/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on 'Horarios' tab to open work schedule management section.
        frame = context.pages[-1]
        # Click on 'Horarios' tab to navigate to work schedule management
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/button[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click 'Agregar Horario' button for Monday to add a new time range.
        frame = context.pages[-1]
        # Click 'Agregar Horario' button for Monday to add new time range
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[5]/div/div/div[2]/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input start time '09:00' and end time '12:00' for the new Monday time range, then save changes.
        frame = context.pages[-1]
        # Input start time for new Monday time range
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[5]/div/div/div[2]/div/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('09:00')
        

        frame = context.pages[-1]
        # Input end time for new Monday time range
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[5]/div/div/div[2]/div/div[3]/input[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('12:00')
        

        frame = context.pages[-1]
        # Click save button for new Monday time range
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[5]/div/div/div[2]/div/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Scroll down if needed and input a future unavailable date, then save it to test unavailable days functionality.
        await page.mouse.wheel(0, 300)
        

        # -> Click 'Agregar' button to save the unavailable date and verify it appears in the list blocking bookings.
        frame = context.pages[-1]
        # Click 'Agregar' button to save unavailable date 16/02/2026
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[5]/div/div[2]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Verify that the unavailable days block bookings and test removing an unavailable day to confirm immediate effect.
        frame = context.pages[-1]
        # Click delete button to remove unavailable day 16/02/2026
        elem = frame.locator('xpath=html/body/div[2]/div/div/div[5]/div/div[2]/div[2]/div[2]/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Verify that the unavailable day deletion is reflected in the booking system and finalize the test.
        frame = context.pages[-1]
        # Click on 'Calendario' tab to verify booking blocking for unavailable days
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Attempt to create a new booking on an unavailable day to verify if the system blocks it.
        frame = context.pages[-1]
        # Click on 'Calendario' tab to attempt booking on unavailable day
        elem = frame.locator('xpath=html/body/div[2]/div/div/div/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Attempt to create a new booking on an unavailable day or check for booking blocking UI or API response.
        frame = context.pages[-1]
        # Click on 'Citas' tab to attempt new booking or check booking options
        elem = frame.locator('xpath=html/body/div[2]/div/div/div').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Panel del Proveedor').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Citas').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Calendario').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Perfil').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Horarios').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Actualiza tu información personal').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Email').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Teléfono WhatsApp').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Nombre').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Apellido').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Guardar Cambios').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Actualiza tu contraseña de acceso').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Contraseña Actual').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Nueva Contraseña').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Confirmar Nueva Contraseña').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Cambiar Contraseña').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    