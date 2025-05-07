// import exportController from './export.controller';

describe('export.controller', () => {
	describe('exportSpace', () => {
		it.todo('should call confluenceService.getSpaceDetails');
		it.todo(
			'should call confluenceService.getPagesInSpace and handle pagination',
		);
		it.todo('should call confluenceService.getPageContent for each page');
		it.todo('should save page content to the specified output directory');
		it.todo('should return a summary in ControllerResponse');
		it.todo('should handle errors from confluenceService');
		it.todo('should use default outputDir if not provided'); // Assuming controller handles this, or CLI
	});
});
